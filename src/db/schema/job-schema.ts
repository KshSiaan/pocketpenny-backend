import {
    pgTable, uuid, varchar, text, integer, timestamp, index,
    unique,
} from 'drizzle-orm/pg-core';
import { categories } from './category-schema.js';
import { user } from './auth-schema.js';
import { relations } from 'drizzle-orm/_relations';


export const jobs = pgTable(
    'jobs',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        author_id: text('author_id').notNull().references(() => user.id, { onDelete: 'no action' }),
        employee_id: text('employee_id').references(() => user.id, { onDelete: 'set null' }),
        title: text('title').notNull().unique(),
        description: text('description'),
        status: varchar('status', { length: 20 }).notNull().default('open'), // open | canceled | in_progress | in_review | revision | completed | disputed
        amount_offered_by_author_min: integer('amount_offered_by_author_min'),
        amount_offered_by_author_max: integer('amount_offered_by_author_max'),
        amount_accepted: integer('amount_accepted'),
        currency: varchar('currency', { length: 3 }).notNull().default('USD'),
        revisionCount: integer('revision_count'),
        category_reference: uuid('category_reference').notNull().references(() => categories.id, { onDelete: 'cascade' }),
        payment_intent_id: text('payment_intent_id'),
        transfer_id: text('transfer_id'),
        platform_fee: integer('platform_fee'),
        agreed_date: timestamp('agreed_date', { withTimezone: true }),
        completedAt: timestamp('completed_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('jobs_category_reference_idx').on(t.category_reference),
        index('jobs_author_id_idx').on(t.author_id),
        index('jobs_employee_id_idx').on(t.employee_id),
        unique('jobs_author_title_unique').on(t.author_id, t.title),
    ],
);


export const jobsRelations = relations(jobs, ({ one }) => ({
    author: one(user, {
        fields: [jobs.author_id],
        references: [user.id],
        relationName: 'authored_jobs',
    }),
    employee: one(user, {
        fields: [jobs.employee_id],
        references: [user.id],
        relationName: 'assigned_jobs',
    }),
    category: one(categories, {
        fields: [jobs.category_reference],
        references: [categories.id],
    }),
}));

export const jobUserRelations = relations(user, ({ many }) => ({
    authoredJobs: many(jobs, { relationName: 'authored_jobs' }),
    assignedJobs: many(jobs, { relationName: 'assigned_jobs' }),
}));




