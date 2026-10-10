import { Module } from '@nestjs/common';
import { AiParseService } from './ai-parse.service';

@Module({
  providers: [AiParseService],
  exports: [AiParseService],
})
export class AiParseModule {}
