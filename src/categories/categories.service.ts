import {
    ConflictException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { categories, jobs } from '../db/schema.js'; // adjust `jobs` / `jobs.categoryId` to your schema
import { type Database, DRIZZLE } from '../database/database.module.js';
import { type CategoryDto, type CategoryIcon } from './validator.pipe.js';
import { createStorageKey, s3 } from '../lib/storage.js';

const BUCKET = 'category';
const UPLOADED_BY = 'Raven';

type CategoryRow = typeof categories.$inferSelect;

@Injectable()
export class CategoriesService {
    private readonly logger = new Logger(CategoriesService.name);
    private readonly endpoint: string;

    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/+$/, '');
        if (!endpoint) {
            throw new Error('AWS_ENDPOINT_URL_S3 is required to build icon URLs');
        }
        this.endpoint = endpoint;
    }

    // ---------- helpers ----------

    private withIconUrl<T extends { icon: string | null }>(category: T) {
        return {
            ...category,
            iconUrl: category.icon
                ? `${this.endpoint}/${BUCKET}/${encodeURIComponent(category.icon)}`
                : null,
        };
    }

    private async uploadIcon(icon: CategoryIcon): Promise<string> {
        const key = createStorageKey(icon.originalname);
        try {
            await s3.send(
                new PutObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                    Body: icon.buffer,
                    ContentType: icon.mimetype,
                    Metadata: {
                        originalname: icon.originalname,
                        size: icon.size.toString(),
                        'uploaded-by': UPLOADED_BY,
                    },
                }),
            );
            return key;
        } catch (err) {
            this.logger.error(`Icon upload failed: ${icon.originalname}`, err);
            throw new UnprocessableEntityException(
                `Failed to upload icon file ${icon.originalname}`,
            );
        }
    }

    /** Best-effort delete: never throws, so cleanup can't mask the real error. */
    private async removeIcon(key: string | null | undefined) {
        if (!key) return;
        try {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        } catch (err) {
            this.logger.warn(`Failed to delete icon ${key} from storage`, err as Error);
        }
    }

    private isUniqueViolation(err: unknown): boolean {
        const e = err as { code?: string; cause?: { code?: string } };
        return e?.code === '23505' || e?.cause?.code === '23505';
    }

    private async getByIdOrFail(id: string): Promise<CategoryRow> {
        const [category] = await this.db
            .select()
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);
        if (!category) throw new NotFoundException(`Category ${id} not found`);
        return category;
    }

    // ---------- queries ----------

    async findAll() {
        const result = await this.db
            .select()
            .from(categories)
            .where(eq(categories.isActive, true))
            .orderBy(asc(categories.name));

        return result.map((c) => this.withIconUrl(c));
    }

    async findOne(slug: string) {
        const [category] = await this.db
            .select()
            .from(categories)
            .where(eq(categories.slug, slug))
            .limit(1);

        if (!category) throw new NotFoundException(`Category ${slug} not found`);
        return this.withIconUrl(category);
    }

    // ---------- mutations ----------

    async createCategory(data: CategoryDto) {
        const key = await this.uploadIcon(data.icon);

        try {
            const [category] = await this.db
                .insert(categories)
                .values({
                    parentId: data.parentId,
                    name: data.name,
                    slug: data.slug,
                    description: data.description,
                    icon: key,
                })
                .returning();

            return {
                message: `Category ${category.name} created successfully`,
                data: this.withIconUrl(category),
            };
        } catch (err) {
            this.logger.error(`Failed to create category ${data.name}`, err as Error);
            await this.removeIcon(key); // roll back the upload

            if (this.isUniqueViolation(err)) {
                throw new ConflictException(`Category slug "${data.slug}" already exists`);
            }
            throw new UnprocessableEntityException(`Failed to create category ${data.name}`);
        }
    }

    async updateCategory(
        id: string,
        data: Omit<CategoryDto, 'icon'> & { icon?: CategoryIcon },
    ) {
        const existing = await this.getByIdOrFail(id);
        const { icon, ...fields } = data;

        const newIconKey = icon ? await this.uploadIcon(icon) : undefined;

        let updated: CategoryRow;
        try {
            [updated] = await this.db
                .update(categories)
                .set({ ...fields, ...(newIconKey && { icon: newIconKey }) })
                .where(eq(categories.id, id))
                .returning();
        } catch (err) {
            this.logger.error(`Failed to update category ${id}`, err as Error);
            await this.removeIcon(newIconKey); // don't orphan the new upload

            if (this.isUniqueViolation(err)) {
                throw new ConflictException(`Category slug "${data.slug}" already exists`);
            }
            throw new UnprocessableEntityException(`Failed to update category ${id}`);
        }

        if (!updated) {
            await this.removeIcon(newIconKey);
            throw new NotFoundException(`Category ${id} not found`);
        }

        if (newIconKey) await this.removeIcon(existing.icon); // old icon, only after DB success

        return {
            message: `Category ${updated.name} updated successfully`,
            data: this.withIconUrl(updated),
        };
    }

    async deleteCategory(id: string) {
        const category = await this.getByIdOrFail(id);

        // BUG FIX: previously queried `categories` again, so this always threw.
        const [job] = await this.db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.category_reference, id))
            .limit(1);

        if (job) {
            throw new UnprocessableEntityException(
                `Cannot delete category ${id} because it has associated jobs`,
            );
        }

        // Delete the DB row first; only then remove the file.
        const [deleted] = await this.db
            .delete(categories)
            .where(eq(categories.id, id))
            .returning();

        await this.removeIcon(category.icon);

        return {
            message: `Category ${deleted.name} deleted successfully`,
            data: deleted,
        };
    }
}