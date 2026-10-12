import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { categories } from '../db/schema.js';
import { type Database, DRIZZLE } from '../database/database.module.js';
import { type CategoryDto, type CategoryIcon } from './validator.pipe.js';
import { createStorageKey, s3 } from '../lib/storage.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';


const bucket = "category";


@Injectable()
export class CategoriesService {
    constructor(@Inject(DRIZZLE) private readonly db: Database) { }

    private async withIconUrl<T extends { icon: string | null }>(
        category: T,
    ): Promise<T & { iconUrl: string | null }> {
        if (!category.icon) return { ...category, iconUrl: null };

        const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/+$/, "");
        if (!endpoint) {
            throw new Error("AWS_ENDPOINT_URL_S3 is required to build an icon URL");
        }

        return {
            ...category,
            iconUrl: `${endpoint}/${bucket}/${encodeURIComponent(category.icon)}`,
        };
    }

    async findAll() {
        const result = await this.db
            .select()
            .from(categories)
            .where(eq(categories.isActive, true))
            .orderBy(asc(categories.name));

        return Promise.all(result.map((category) => this.withIconUrl(category)));
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

    async createCategory(data: CategoryDto) {

        const key = createStorageKey(data.icon.originalname);

        try {
            await s3.send(new PutObjectCommand({
                Bucket: bucket, Key: key,
                Body: data?.icon?.buffer,
                ContentType: data?.icon?.mimetype,
                Metadata: {
                    originalname: data?.icon?.originalname,
                    size: data?.icon?.size.toString(),
                    'uploaded-by': "Raven"
                }
            }));
        } catch (err) {
            console.log(err);
            return new UnprocessableEntityException(`Failed to upload icon file ${data?.icon?.originalname} to Neon S3`);
        }

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
                data: await this.withIconUrl(category),
            };
        } catch (error) {
            console.error(error);
            await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            }));
            return new UnprocessableEntityException(`Failed to create category ${data.name}`);
        }
    }

    async updateCategory(
        id: string,
        data: Omit<CategoryDto, 'icon'> & { icon?: CategoryIcon },
    ) {
        const [category] = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
        if (!category) throw new NotFoundException(`Category ${id} not found`);

        let newIconKey: string | undefined;
        if (data.icon) {
            newIconKey = createStorageKey(data.icon.originalname);

            try {
                await s3.send(new PutObjectCommand({
                    Bucket: bucket,
                    Key: newIconKey,
                    Body: data.icon.buffer,
                    ContentType: data.icon.mimetype,
                    Metadata: {
                        originalname: data.icon.originalname,
                        size: data.icon.size.toString(),
                        'uploaded-by': "Raven",
                    },
                }));
            } catch (error) {
                console.error(error);
                return new UnprocessableEntityException(
                    `Failed to upload icon file ${data.icon.originalname} to Neon S3`,
                );
            }
        }

        const { icon: _icon, ...categoryFields } = data;
        const updatedCategory = await this.db
            .update(categories)
            .set({
                ...categoryFields,
                ...(newIconKey ? { icon: newIconKey } : {}),
            })
            .where(eq(categories.id, id))
            .returning();

        if (newIconKey && category.icon) {
            await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: category.icon,
            }));
        }

        return {
            message: `Category ${updatedCategory[0].name} updated successfully`,
            data: await this.withIconUrl(updatedCategory[0]),
        };
    }

    async deleteCategory(id: string) {
        try {
            await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: (await this.db.select().from(categories).where(eq(categories.id, id)).limit(1))[0].icon!,
            }));
        } catch (err) {
            console.log(err);
            return new UnprocessableEntityException(`Failed to delete icon file for category ${id} from Neon S3`);
        }

        const result = await this.db.delete(categories).where(eq(categories.id, id)).returning();
        return {
            message: `Category ${result[0].name} deleted successfully`,
            data: {
                ...result[0]
            }
        }
    }


}