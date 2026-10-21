import {
    pgTable, uuid, varchar, text, timestamp, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm/_relations';

import { user } from './auth-schema.js';
import { jobs } from '../schema.js';

export const TICKET_STATUSES = [
    'open',
    'under_review',
    'resolved',
    'rejected',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const ticket = pgTable(
    'ticket',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        job_reference: uuid('job_reference')
            .notNull()
            .references(() => jobs.id, { onDelete: 'cascade' }),
        raised_by: text('raised_by').references(() => user.id, { onDelete: 'set null' }),
        resolved_by: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
        status: varchar('status', { length: 20 })
            .$type<TicketStatus>()
            .notNull()
            .default('open'),
        reason: text('reason').notNull(),
        description: text('description'),
        resolution: text('resolution'),
        resolution_note: text('resolution_note'),

        resolved_at: timestamp('resolved_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        // FK lookups: "all tickets for this job" (also speeds up cascade deletes)
        // + the common "tickets for this job filtered by status" in one index
        index('ticket_job_status_idx').on(t.job_reference, t.status),

        // "my tickets" views
        index('ticket_raised_by_idx').on(t.raised_by),

        // "tickets this admin resolved"
        index('ticket_resolved_by_idx').on(t.resolved_by),

        // Admin queue: filter by status, newest first
        index('ticket_status_created_idx').on(t.status, t.createdAt.desc()),

        // Enforce valid statuses at the DB level
        check(
            'ticket_status_check',
            sql`${t.status} in ('open', 'under_review', 'resolved', 'rejected')`,
        ),
    ],
);

export const ticketRelations = relations(ticket, ({ one }) => ({
    job: one(jobs, {
        fields: [ticket.job_reference],
        references: [jobs.id],
    }),
    // Two FKs point at `user`, so each needs a relationName
    raisedBy: one(user, {
        fields: [ticket.raised_by],
        references: [user.id],
        relationName: 'ticket_raised_by',
    }),
    resolvedBy: one(user, {
        fields: [ticket.resolved_by],
        references: [user.id],
        relationName: 'ticket_resolved_by',
    }),
}));