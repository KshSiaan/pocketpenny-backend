import { Body, Controller, Get, Post } from '@nestjs/common';
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
    return this.bidsService.createBid(session.user, body);
  }

}
