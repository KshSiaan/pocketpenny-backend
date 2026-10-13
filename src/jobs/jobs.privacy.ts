import { Injectable } from '@nestjs/common';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { jobs } from '../db/schema/job-schema.js';

type Job = typeof jobs.$inferSelect;

export const JOB_EDIT_WINDOW_MS = 30 * 60 * 1000;

export type EditCheck =
    | { canEdit: true }
    | { canEdit: false; code: 'NOT_FOUND' | 'NOT_OWNER' | 'WINDOW_EXPIRED'; reason: string };

@Injectable()
export class JobEditPolicy {
    check(
        job: Job | null | undefined,
        user: UserSession['user'],
        now: Date = new Date(),
    ): EditCheck {
        if (!job) {
            return { canEdit: false, code: 'NOT_FOUND', reason: 'Job not found' };
        }
        if (job.author_id !== user.id) {
            return { canEdit: false, code: 'NOT_OWNER', reason: 'You are not the owner of this job' };
        }
        if (now.getTime() - job.createdAt.getTime() > JOB_EDIT_WINDOW_MS) {
            return { canEdit: false, code: 'WINDOW_EXPIRED', reason: 'Jobs can only be edited within 30 minutes of creation' };
        }
        return { canEdit: true };
    }
}