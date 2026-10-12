// database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { db } from '../lib/db.js';

export const DRIZZLE = Symbol('DRIZZLE');
export type Database = typeof db;

@Global()
@Module({
    providers: [{ provide: DRIZZLE, useValue: db }],
    exports: [DRIZZLE],
})
export class DatabaseModule { }