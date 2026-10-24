import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { type Database, DRIZZLE } from '../database/database.module.js';
import { jobs, projectLog, ticket } from '../db/schema.js';

// Adjust to your real status values
const DELIVERABLE_STATUSES = ['in_progress', 'revision_requested'];
const COMPLETABLE_STATUSES = ['submitted'];

const MAX_REVISIONS = 3; // Adjust to your real max revisions limit

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


    async completeOrRevisionProject(
        jobReference: string,
        user: UserSession['user'],
        status: 'completed' | 'revision_requested',
        reason?: string,
    ) {

        const now = new Date();
        const isRevision = status === 'revision_requested';

        const [job] = await this.db
            .select({
                author_id: jobs.author_id,
                status: jobs.status,
                revisionCount: jobs.revisionCount,
            })
            .from(jobs)
            .where(eq(jobs.id, jobReference))
            .limit(1);

        if (!job) throw new NotFoundException(`Job ${jobReference} not found`);

        if (job.author_id !== user.id) {
            throw new ForbiddenException('You are not the author of this job');
        }

        if (!COMPLETABLE_STATUSES.includes(job.status)) {
            throw new ConflictException(
                `Job cannot be ${isRevision ? 'sent for revision' : 'completed'} while in status "${job.status}"`,
            );
        }

        if (isRevision) {
            if (!reason?.trim()) {
                throw new BadRequestException('A reason is required to request a revision');
            }

            if ((job.revisionCount ?? 0) >= MAX_REVISIONS) {
                throw new ConflictException(
                    `Revision limit of ${MAX_REVISIONS} reached. Please complete the job, cancel it, or open a dispute.`,
                );
            }
        }

        // 2. Update (guards repeated in WHERE so a concurrent request can't slip through)
        const [updatedJob] = await this.db
            .update(jobs)
            .set(
                isRevision
                    ? {
                        status,
                        // Atomic increment, NULL-safe
                        revisionCount: sql`coalesce(${jobs.revisionCount}, 0) + 1`,
                    }
                    : { status, completedAt: now },
            )
            .where(
                and(
                    eq(jobs.id, jobReference),
                    eq(jobs.author_id, user.id),
                    inArray(jobs.status, COMPLETABLE_STATUSES),
                    // NULL-safe limit check (NULL < 3 is never true in SQL)
                    ...(isRevision
                        ? [sql`coalesce(${jobs.revisionCount}, 0) < ${MAX_REVISIONS}`]
                        : []),
                ),
            )
            .returning();

        if (!updatedJob) {
            // Only reachable if the job changed between the check and the update
            throw new ConflictException(
                'Job was modified by another request. Please refresh and try again.',
            );
        }

        // 3. Log
        try {
            await this.db.insert(projectLog).values({
                job_reference: jobReference,
                creator: user.id,
                action: isRevision ? 'revision_requested' : 'job_completed',
                message: isRevision
                    ? `${user.name} requested revision for the job on ${now.toDateString()}. Reason: ${reason}`
                    : `${user.name} completed the job on ${now.toDateString()}. Payment has been processed.`,
            });
        } catch (error) {
            this.logger.error(`Failed to write log for job ${jobReference}`, error);
        }

        return {
            message: isRevision
                ? `Revision requested for job ${updatedJob.title.slice(0, 50)}...`
                : `Job ${updatedJob.title.slice(0, 50)}... completed successfully. Payment has been processed.`,
            data: updatedJob,
        };
    }

    async createTicket(user: UserSession['user'], jobReference: string, reason: string, description?: string) {
        const [job] = await this.db
            .select({
                author_id: jobs.author_id,
                employee_id: jobs.employee_id,
                status: jobs.status,
                revisionCount: jobs.revisionCount
            })
            .from(jobs)
            .where(eq(jobs.id, jobReference))
            .limit(1);

        if (!job) throw new NotFoundException(`Job ${jobReference} not found`);

        if (![job.author_id, job.employee_id].includes(user.id)) {
            throw new ForbiddenException('You are not connected to this job');
        }

        let createdTicket: typeof ticket.$inferSelect;

        try {
            const [newTicket] = await this.db.insert(ticket).values({
                job_reference: jobReference,
                reason,
                description,
                raised_by: user.id,
                status: "open",
            }).returning()

            createdTicket = newTicket;
        } catch (err) {
            return new InternalServerErrorException('Failed to create ticket');
        }
        let updatedJob: typeof jobs.$inferSelect;
        try {
            const [oldJob] = await this.db.update(jobs).set({
                "status": "disputed"
            }).returning()

            updatedJob = oldJob;
        } catch (err) {
            return new InternalServerErrorException('Failed to update Job');
        }


        return {
            message: `Created a ticket Successfully`,
            data: {
                ...updatedJob,
                ticket: {
                    ...createdTicket
                }
            }
        }

    }
}