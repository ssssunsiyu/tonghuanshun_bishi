import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { FuyaoDataModule } from './modules/fuyao-data/fuyao-data.module';
import { AiParseModule } from './modules/ai-parse/ai-parse.module';
import { ScreenEngineModule } from './modules/screen-engine/screen-engine.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { ConfigModule } from './modules/config/config.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    FuyaoDataModule,
    AiParseModule,
    ScreenEngineModule,
    StrategyModule,
    ConfigModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
