import {
  Controller,
  Get,
  Logger,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import type { DataConfigStatus } from '@shared/api.interface';

@Controller('api/config')
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  getStatus(): DataConfigStatus {
    return {
      fuyaoConfigured: this.configService.isFuyaoConfigured(),
      aiConfigured: this.configService.isAiConfigured(),
      fuyaoKeyEnv: 'FUYAO_API_KEY',
      aiEnv: 'AI_PARSE_INSTANCE_ID',
      fuyaoKeySource: this.configService.getFuyaoApiKeySource(),
      lastChecked: new Date().toISOString(),
    };
  }
}
