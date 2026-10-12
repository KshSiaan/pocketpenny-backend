import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from "./lib/auth.js"; // Your Better Auth instance
import { UserModule } from './user/user.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { DatabaseModule } from './database/database.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    AuthModule.forRoot({
      auth,

      // bodyParser: {
      //   json: { limit: "2mb" },
      //   urlencoded: { limit: "2mb", extended: true },
      //   rawBody: true,
      // },
    }),
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'micro',
    }),
    UserModule,
    CategoriesModule,
    DatabaseModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
