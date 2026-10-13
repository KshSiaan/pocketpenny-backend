import {
    pgTable, uuid, varchar, text, integer, timestamp, index,
    unique,
} from 'drizzle-orm/pg-core';

import { user } from './auth-schema.js';
import { jobs } from './job-schema.js';
import { relations } from 'drizzle-orm/_relations';



export const bids = pgTable(
    'bids',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        job_reference: uuid('job_reference')
            .notNull()
            .references(() => jobs.id, { onDelete: 'cascade' }),
        applicant: text('applicant').notNull().references(() => user.id, { onDelete: 'cascade' }),
        status: varchar('status', { length: 20 }).notNull().default('pending'),
        proposed_amount: integer('proposed_amount'),
        note: text('note'),
        estimated_days: integer('estimated_days'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('bids_job_reference_idx').on(t.job_reference),
        index('bids_applicant_idx').on(t.applicant),
    ],
);
export const bidsRelations = relations(bids, ({ one }) => ({
    job: one(jobs, {
        fields: [bids.job_reference],
        references: [jobs.id],
        relationName: 'job_bids',
    }),
    applicantUser: one(user, {
        fields: [bids.applicant],
        references: [user.id],
    }),
}));
