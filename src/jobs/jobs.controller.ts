import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  @AllowAnonymous()
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  createJob(@Session() session: UserSession,
    @Body(new ZodValidationPipe(JobSchema))
    body: JobDto) {
    return this.jobsService.createJob(session.user, body);
  }

  @Delete(':id')
  deleteJob(@Session() session: UserSession, @Param('id') id: string) {
    return this.jobsService.deleteJob(session.user, id);
  }

  @Patch(':id')
  updateJob(@Session() session: UserSession, @Param('id') id: string,
    @Body(new ZodValidationPipe(JobSchema.partial()))
    body: Partial<JobDto>) {
    return this.jobsService.updateJob(session.user, id, body);
  }



}
