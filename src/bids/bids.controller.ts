import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BidsService } from './bids.service.js';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../lib/zod-validation-pipe.js';
import { type BidDto, BidSchema } from './validator.pipe.js';

@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) { }

  @Get()
  @Roles(["admin"])
  findAll() {
    return this.bidsService.findAll();
  }

  @Post()
  createBid(@Session() session: UserSession,
    @Body(new ZodValidationPipe(BidSchema))
    body: BidDto
  ) {
    return this.bidsService.createBid(session?.user, body);
  }

  @Patch(':id')
  updateBid(@Session() session: UserSession,
    @Body(new ZodValidationPipe(BidSchema.partial()))
    body: Partial<BidDto>,
    @Param('id') bidId: string
  ) {
    return this.bidsService.updateBid(session?.user, bidId, body);
  }

  @Delete(':id')
  deleteBid(@Session() session: UserSession,
    @Param('id') bidId: string
  ) {
    return this.bidsService.deleteBid(session?.user, bidId);
  }

  @Patch(':id/accept')
  acceptBid(@Session() session: UserSession,
    @Param('id') bidId: string
  ) {
    return this.bidsService.acceptBid(session?.user, bidId);
  }

}
