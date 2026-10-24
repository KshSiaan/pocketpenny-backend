import { BadRequestException, Body, Controller, NotAcceptableException, Param, Patch } from '@nestjs/common';
import { ProjectService } from './project.service.js';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  @Patch(':jobReference/deliver')
  async deliverProject(@Param('jobReference') jobReference: string, @Session() session: UserSession) {
    return this.projectService.deliverProject(jobReference, session.user);
  }

  @Patch(':jobReference/complete')
  async completeProject(@Param('jobReference') jobReference: string, @Session() session: UserSession) {
    return this.projectService.completeOrRevisionProject(jobReference, session.user, 'completed');
  }

  @Patch(':jobReference/revision')
  async requestRevision(
    @Param('jobReference') jobReference: string,
    @Session() session: UserSession,
    @Body() body: { reason: string },
  ) {

    const reason = body?.reason?.trim();

    if (!reason) {
      throw new BadRequestException(
        'Reason for revision request is required.',
      );
    }

    if (reason.length < 5) {
      throw new BadRequestException(
        'Reason for revision request must be at least 5 characters long.',
      );
    }

    return this.projectService.completeOrRevisionProject(
      jobReference,
      session.user,
      'revision_requested',
      reason,
    );
  }

  @Patch(':jobReference/ticket')
  async createTicket(
    @Param('jobReference') jobReference: string,
    @Session() session: UserSession,
    @Body() body: { reason: string, description: string }
  ) {

    if (!body.reason || !body.description) {
      return new NotAcceptableException("Please provide reason and description")
    }

    return this.projectService.createTicket(session.user, jobReference, body.reason, body.description)
  }
}