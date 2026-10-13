import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller()
@AllowAnonymous() // Allow anonymous access to this controller
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}