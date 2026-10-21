import {
    pgTable, uuid, varchar, text, integer, timestamp, index,
    unique,
} from 'drizzle-orm/pg-core';

import { user } from './auth-schema.js';
import { relations } from 'drizzle-orm/_relations';
import { jobs } from '../schema.js';

export const ticket = pgTable(
    'ticket',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        job_reference: uuid('job_reference')
            .notNull()
            .references(() => jobs.id, { onDelete: 'cascade' }),
        raised_by: text('raised_by').references(() => user.id, { onDelete: 'set null' }),
        resolved_by: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
        status: varchar('status', { length: 20 }).notNull().default('open'), // open | under_review  | resolved | in_review | rejected 
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
        // index('jobs_category_reference_idx').on(t.category_reference),
    ],
);