import { Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { type Database, DRIZZLE } from '../database/database.module.js';
import { categories, jobs } from '../db/schema.js';
import { asc, eq } from 'drizzle-orm';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { JobDto } from './validator.pipe.js';


@Injectable()
export class JobsService {
    constructor(@Inject(DRIZZLE) private readonly db: Database) { }

    findAll() {
        return this.db.select().from(jobs).orderBy(asc(jobs.createdAt));;
    }

    async createJob(user: UserSession['user'], body: JobDto) {
        const category = await this.db.select().from(categories).where(eq(categories.id, body.category_reference)).limit(1);

        if (!category || category.length === 0) {
            throw new NotFoundException(`Category with id ${body.category_reference} does not exist`);
        }

        const newJob: typeof jobs.$inferInsert = {
            ...body,
            author_id: user.id,
            status: 'open',
        }

        try {
            const [createdJob] = await this.db.insert(jobs).values(newJob).returning();

            if (!createdJob) {
                throw new Error('Failed to create job');
            }
            return {
                message: `Job was successfully created by ${user.name}`,
                data: createdJob,
            }
        } catch (error: any) {

            throw new InternalServerErrorException('Failed to create job', { "description": error instanceof Error ? error.message : String(error) });
        }
    }
}
