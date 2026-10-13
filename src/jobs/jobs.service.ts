import { Inject, Injectable, InternalServerErrorException, NotAcceptableException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { type Database, DRIZZLE } from '../database/database.module.js';
import { categories, jobs } from '../db/schema.js';
import { asc, eq } from 'drizzle-orm';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { JobDto } from './validator.pipe.js';
import { JobEditPolicy } from './jobs.privacy.js';



@Injectable()
export class JobsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: Database,
        private readonly jobEditPolicy: JobEditPolicy
    ) { }

    findAll() {
        return this.db.select().from(jobs).orderBy(asc(jobs.createdAt));;
    }

    async findOne(id: string) {
        const [job] = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
        return job;
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

    async deleteJob(user: UserSession['user'], id: string) {
        const [job] = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);

        const editCheck = this.jobEditPolicy.check(job, user);

        if (!editCheck.canEdit) {
            throw new NotAcceptableException(editCheck.reason);
        }

        try {
            const [deletedJob] = await this.db.delete(jobs).where(eq(jobs.id, id)).returning();
            return {
                message: `Job was successfully deleted by ${user.name}`,
                data: deletedJob,
            }
        } catch (error: any) {
            throw new InternalServerErrorException('Failed to delete job', { "description": error instanceof Error ? error.message : String(error) });
        }
    }

    async updateJob(user: UserSession['user'], id: string, body: Partial<JobDto>) {
        const [job] = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);

        const editCheck = this.jobEditPolicy.check(job, user);

        if (!editCheck.canEdit) {
            throw new NotAcceptableException(editCheck.reason);
        }

        try {
            const [updatedJob] = await this.db.update(jobs).set(body).where(eq(jobs.id, id)).returning();
            return {
                message: `Job was successfully updated by ${user.name}`,
                data: updatedJob,
            }
        } catch (error: any) {
            throw new InternalServerErrorException('Failed to update job', { "description": error instanceof Error ? error.message : String(error) });
        }
    }

}