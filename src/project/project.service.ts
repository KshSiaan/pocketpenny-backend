import {
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { type Database, DRIZZLE } from '../database/database.module.js';
import { jobs, projectLog } from '../db/schema.js';

// Adjust to your real status values
const DELIVERABLE_STATUSES = ['in_progress', 'revision_requested'];
const COMPLETABLE_STATUSES = ['submitted'];

@Injectable()
export class ProjectService {
    private readonly logger = new Logger(ProjectService.name);

    constructor(@Inject(DRIZZLE) private readonly db: Database) { }

    async deliverProject(jobReference: string, user: UserSession['user']) {
        const now = new Date();

        // Guard lives in the WHERE clause, so check + update is one atomic statement
        const [updatedJob] = await this.db
            .update(jobs)
            .set({ status: 'submitted', completedAt: now })
            .where(
                and(
                    eq(jobs.id, jobReference),
                    eq(jobs.employee_id, user.id),
                    inArray(jobs.status, DELIVERABLE_STATUSES),
                ),
            )
            .returning();

        if (!updatedJob) {
            // Nothing updated: work out why, for a useful error
            const [job] = await this.db
                .select({ employee_id: jobs.employee_id, status: jobs.status })
                .from(jobs)
                .where(eq(jobs.id, jobReference))
                .limit(1);

            if (!job) throw new NotFoundException(`Job ${jobReference} not found`);
            if (job.employee_id !== user.id) {
                throw new ForbiddenException('You are not assigned to this job as employee');
            }
            throw new ConflictException(
                `Job cannot be delivered while in status "${job.status}"`,
            );
        }

        try {
            await this.db.insert(projectLog).values({
                job_reference: jobReference,
                creator: user.id,
                action: 'job_delivered',
                message: `${user.name} delivered the work on ${now.toDateString()}. The client has 2 days to approve or request revisions. If approved, the job is completed and payment is processed. If revisions are requested, the job returns to ${user.name}.`,
            });
        } catch (error) {
            this.logger.error(`Failed to write delivery log for job ${jobReference}`, error);
        }

        return {
            message: `Job ${updatedJob.title.slice(0, 50)}... delivered successfully. The client has 2 days to approve or request revisions.`,
            data: updatedJob
        };
    }



    async completeOrRevisionProject(jobReference: string, user: UserSession['user'], status: 'completed' | 'revision_requested', reason?: string) {
        const now = new Date();

        const [updatedJob] = await this.db
            .update(jobs)
            .set({ status: status, completedAt: now })
            .where(
                and(
                    eq(jobs.id, jobReference),
                    eq(jobs.author_id, user.id),
                    inArray(jobs.status, COMPLETABLE_STATUSES),
                ),
            )
            .returning();

        if (!updatedJob) {
            // Nothing updated: work out why, for a useful error
            const [job] = await this.db
                .select({ author_id: jobs.author_id, status: jobs.status })
                .from(jobs)
                .where(eq(jobs.id, jobReference))
                .limit(1);

            if (!job) throw new NotFoundException(`Job ${jobReference} not found`);
            if (job.author_id !== user.id) {
                throw new ForbiddenException('You are not the author of this job');
            }
            throw new ConflictException(
                `Job cannot be completed while in status "${job.status}"`,
            );
        }

        try {
            await this.db.insert(projectLog).values({
                job_reference: jobReference,
                creator: user.id,
                action: status === 'completed' ? 'job_completed' : 'revision_requested',
                message: status === 'completed' ? `${user.name} completed the job on ${now.toDateString()}. Payment has been processed.` : `${user.name} requested revision for the job on ${now.toDateString()}. Reason: ${reason}`,
            });
        } catch (error) {
            this.logger.error(`Failed to write completion log for job ${jobReference}`, error);
        }

        return {
            message: `Job ${updatedJob.title.slice(0, 50)}... ${status === 'completed' ? 'completed' : 'revision requested'} successfully. Payment has been processed.`,
            data: updatedJob
        };

    }
}