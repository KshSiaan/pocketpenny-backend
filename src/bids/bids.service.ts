import { Inject, Injectable, InternalServerErrorException, NotAcceptableException } from '@nestjs/common';
import { Filter } from 'bad-words'
import { type Database, DRIZZLE } from '../database/database.module.js';
import { bids } from '../db/schema/bid-schema.js';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { BidDto } from './validator.pipe.js';
import { jobs } from '../db/schema/job-schema.js';
import { eq, and } from 'drizzle-orm';
@Injectable()
export class BidsService {
    constructor(@Inject(DRIZZLE) private readonly db: Database) { }

    findAll(limit = 50, offset = 0) {
        return this.db.select().from(bids).limit(limit).offset(offset);
    }

    async createBid(user: UserSession['user'], body: BidDto) {
        const selectedJob = await this.db.select().from(jobs).where(eq(jobs.id, body.job_reference)).execute();

        if (!selectedJob || selectedJob.length === 0) {
            throw new Error('Job not found');
        }

        if (selectedJob[0].author_id === user?.id) {
            throw new NotAcceptableException('You cannot bid on your own job');
        }

        if (selectedJob[0].status !== 'open') {
            throw new NotAcceptableException('You cannot bid on a job that is not open');
        }

        const [checkSameBid] = await this.db.select().from(bids).where(and(eq(bids.job_reference, body.job_reference), eq(bids.applicant, user?.id))).execute();

        if (checkSameBid) {
            throw new NotAcceptableException('You have already placed a bid on this job');
        }

        const newBid = {
            ...body,
            applicant: user?.id,
        }

        try {
            const [createdBid] = await this.db.insert(bids).values(newBid).returning();
            return {
                message: `Bid was successfully created by ${user.name}`,
                data: createdBid,
            }
        } catch (error: any) {
            throw new InternalServerErrorException('Failed to create bid', { "description": error instanceof Error ? error.message : String(error) });
        }


    }
}
