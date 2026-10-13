import { Module } from '@nestjs/common';
import { BidsService } from './bids.service.js';
import { BidsController } from './bids.controller.js';

@Module({
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
