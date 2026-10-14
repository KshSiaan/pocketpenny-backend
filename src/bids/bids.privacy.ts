import { Injectable, NotAcceptableException } from '@nestjs/common';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { bids, jobs } from '../db/schema.js';


type Bid = typeof bids.$inferSelect;
type Job = typeof jobs.$inferSelect;

export const BID_EDIT_WINDOW_MS = 5 * 60 * 1000;

export type EditCheck =
    | { canEdit: true }
    | { canEdit: false; code: 'NOT_FOUND' | 'NOT_OWNER' | 'WINDOW_EXPIRED'; reason: string };

@Injectable()
export class BidEditPolicy {

    checkToCreate(job: Job | null | undefined, user: UserSession['user']) {
        if (job?.author_id === user?.id) {
            throw new NotAcceptableException('You cannot bid on your own job');
        }

        if (job?.status !== 'open') {
            throw new NotAcceptableException('You cannot bid on a job that is not open');
        }
    }

    checkSameBid(bid: Bid | null | undefined) {
        if (bid) {
            throw new NotAcceptableException('You have already placed a bid on this job');
        }
    }

    checkToEdit(
        job: Job | null | undefined,
        bid: Bid | null | undefined,
        user: UserSession['user'],
        now: Date = new Date(),
    ): EditCheck {



        if (!bid) {
            return { canEdit: false, code: 'NOT_FOUND', reason: 'Bid not found' };
        }
        if (user.role === 'admin') {
            return { canEdit: true };
        }
        if (bid.applicant !== user.id) {
            return { canEdit: false, code: 'NOT_OWNER', reason: 'You are not the owner of this bid' };
        }
        if (now.getTime() - bid.createdAt.getTime() > BID_EDIT_WINDOW_MS) {
            return { canEdit: false, code: 'WINDOW_EXPIRED', reason: 'Bids can only be edited within 30 minutes of creation' };
        }
        return { canEdit: true };
    }
}