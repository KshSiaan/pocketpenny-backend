import {
    pgTable, uuid, varchar, text, timestamp, index,
} from 'drizzle-orm/pg-core';

import { user } from './auth-schema.js';
import { jobs } from './job-schema.js';
import { relations } from 'drizzle-orm/_relations';



export const projectLog = pgTable(
    'project_log',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        job_reference: uuid('job_reference')
            .notNull()
            .references(() => jobs.id, { onDelete: 'cascade' }),
        creator: text('creator').references(() => user.id, { onDelete: 'set null' }),
        action: varchar('action', { length: 50 }).notNull(),
        message: text('message'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('project_log_job_reference_idx').on(t.job_reference),
        index('project_log_creator_idx').on(t.creator),
    ],
);
export const projectLogRelations = relations(projectLog, ({ one }) => ({
    job: one(jobs, {
        fields: [projectLog.job_reference],
        references: [jobs.id],
        relationName: 'job_project_log',
    }),
    applicantUser: one(user, {
        fields: [projectLog.creator],
        references: [user.id],
    }),
}));