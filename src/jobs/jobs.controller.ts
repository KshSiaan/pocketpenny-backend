import { Body, Controller, Get, Post } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { AllowAnonymous, OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../lib/zod-validation-pipe.js';
import { type JobDto, JobSchema } from './validator.pipe.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Get()
  @AllowAnonymous()
  findAll() {
    return this.jobsService.findAll();
  }

  @Post()
  createJob(@Session() session: UserSession,
    @Body(new ZodValidationPipe(JobSchema))
    body: JobDto) {
    return this.jobsService.createJob(session.user, body);
  }





}
