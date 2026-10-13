import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { StandardSchemaValidationPipe } from '@nestjs/common';

import type { IncomingMessage, ServerResponse } from 'node:http';

let appPromise: ReturnType<typeof createApp> | undefined;

async function createApp() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bodyParser: false
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  const config = new DocumentBuilder()
    .setTitle("Pocketpenny API documentation")
    .setDescription("List of all available endpoints and their request/response schemas except BetterAuth endpoints")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, document);
  await app.init();
  return app;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  appPromise ??= createApp();
  const app = await appPromise;
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp(request, response);
}