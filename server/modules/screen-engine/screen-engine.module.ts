import { Module } from '@nestjs/common';
import { FuyaoDataModule } from '../fuyao-data/fuyao-data.module';
import { AiParseModule } from '../ai-parse/ai-parse.module';
import { ScreenEngineController } from './screen-engine.controller';
import { ScreenEngineService } from './screen-engine.service';

@Module({
  imports: [FuyaoDataModule, AiParseModule],
  controllers: [ScreenEngineController],
  providers: [ScreenEngineService],
  exports: [ScreenEngineService],
})
export class ScreenEngineModule {}
