import { Inject, Injectable, InternalServerErrorException, NotAcceptableException } from '@nestjs/common';
import { Filter } from 'bad-words'
import { type Database, DRIZZLE } from '../database/database.module.js';
import { bids } from '../db/schema/bid-schema.js';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { BidDto } from './validator.pipe.js';
import { jobs } from '../db/schema/job-schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { BidEditPolicy } from './bids.privacy.js';

@Injectable()
export class BidsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: Database,
        private readonly bidEditPolicy: BidEditPolicy
    ) { }

    findAll(limit = 50, offset = 0) {
        return this.db.select().from(bids).limit(limit).offset(offset);
    }

    async createBid(user: UserSession['user'], body: BidDto) {
        const selectedJob = await this.db.select().from(jobs).where(eq(jobs.id, body.job_reference)).limit(1).execute();

        if (!selectedJob || selectedJob.length === 0) {
            throw new Error('Job not found');
        }

        this.bidEditPolicy.checkToCreate(selectedJob[0], user);
        const [sameBid] = await this.db.select().from(bids).where(and(eq(bids.job_reference, body.job_reference), eq(bids.applicant, user?.id))).execute();
        this.bidEditPolicy.checkSameBid(sameBid)

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

    async updateBid(user: UserSession['user'], bidId: string, body: Partial<BidDto>) {

        const [selectedBid] = await this.db.select().from(bids).where(eq(bids.id, bidId)).limit(1).execute();

        if (!selectedBid) {
            throw new NotAcceptableException('Bid not found');
        }

        const [selectedJob] = await this.db.select().from(jobs).where(eq(jobs.id, selectedBid.job_reference)).limit(1).execute();

        this.bidEditPolicy.checkToEdit(selectedJob, selectedBid, user);

        try {
            const [updatedBid] = await this.db.update(bids).set(body).where(eq(bids.id, bidId)).returning().execute();
            return {
                message: `Bid was successfully updated by ${user.name}`,
                data: updatedBid,
            }
        } catch (error: any) {
            throw new InternalServerErrorException('Failed to update bid', { "description": error instanceof Error ? error.message : String(error) });
        }
    }

    async deleteBid(user: UserSession['user'], bidId: string) {
        const [selectedBid] = await this.db.select().from(bids).where(eq(bids.id, bidId)).limit(1).execute();

        if (!selectedBid) {
            throw new NotAcceptableException('Bid not found');
        }

        const [selectedJob] = await this.db.select().from(jobs).where(eq(jobs.id, selectedBid.job_reference)).limit(1).execute();

        this.bidEditPolicy.checkToEdit(selectedJob, selectedBid, user);

        const [deletedBid] = await this.db.delete(bids).where(eq(bids.id, bidId)).returning().execute();
        return {
            message: `Bid was successfully deleted by ${user.name}`,
            data: deletedBid,
        };
    }

    async acceptBid(user: UserSession['user'], bidId: string) {
        const [selectedBid] = await this.db.select().from(bids).where(eq(bids.id, bidId)).limit(1).execute();

        if (!selectedBid) {
            throw new NotAcceptableException('Bid not found');
        }


        const [selectedJob] = await this.db.select().from(jobs).where(eq(jobs.id, selectedBid.job_reference)).limit(1).execute();

        if (selectedJob.status !== 'open') {
            throw new NotAcceptableException('You cannot accept a bid on a job that is not open');
        }

        this.bidEditPolicy.checkToAccept(selectedJob, selectedBid, user);

        let newAgreedDate = null;

        if (selectedBid.estimated_days) {
            newAgreedDate = new Date();
            newAgreedDate.setDate(newAgreedDate.getDate() + selectedBid.estimated_days);
        }
        try {
            const [acceptedRows] = await this.db.batch([
                // 1. Accept the chosen bid
                this.db
                    .update(bids)
                    .set({ status: 'accepted' })
                    .where(eq(bids.id, bidId))
                    .returning(),

                // 2. Move the job to in_progress
                this.db
                    .update(jobs)
                    .set({
                        status: 'in_progress',
                        employee_id: selectedBid.applicant,
                        agreed_date: newAgreedDate,
                        amount_accepted: selectedBid.proposed_amount,
                    }).where(eq(jobs.id, selectedBid.job_reference)),

                // 3. Reject every other pending bid on the same job
                this.db
                    .update(bids)
                    .set({ status: 'rejected' })
                    .where(
                        and(
                            eq(bids.job_reference, selectedBid.job_reference),
                            ne(bids.id, bidId),
                            eq(bids.status, 'pending'),
                        ),
                    ),
            ]);

            const updatedBid = acceptedRows[0];
            if (!updatedBid) {
                throw new InternalServerErrorException('Failed to accept bid');
            }

            return {
                message: `Bid was successfully accepted by ${user.name}`,
                data: updatedBid,
            };
        } catch (error: any) {
            throw new InternalServerErrorException('Failed to accept bid', {
                description: error instanceof Error ? error.message : String(error),
            });
        }
    }


}
