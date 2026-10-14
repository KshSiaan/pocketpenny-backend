import { Module } from '@nestjs/common';
import { BidsService } from './bids.service.js';
import { BidsController } from './bids.controller.js';
import { BidEditPolicy } from './bids.privacy.js';

@Module({
  controllers: [BidsController],
  providers: [BidsService, BidEditPolicy],
})
export class BidsModule { }
