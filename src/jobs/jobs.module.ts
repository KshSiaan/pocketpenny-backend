import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { JobsController } from './jobs.controller.js';
import { JobEditPolicy } from './jobs.privacy.js';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobEditPolicy],
})
export class JobsModule { }
