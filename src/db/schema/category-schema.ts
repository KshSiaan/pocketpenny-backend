import {
    pgTable, uuid, varchar, text, boolean, integer, timestamp, index,
    type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const categories = pgTable(
    'categories',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
            onDelete: 'restrict',
        }),
        name: varchar('name', { length: 100 }).notNull(),
        slug: varchar('slug', { length: 120 }).notNull().unique(),
        description: text('description'),
        icon: text('icon_url'),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [index('categories_parent_id_idx').on(t.parentId)],
);