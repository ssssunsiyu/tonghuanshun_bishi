import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ScreenEngineService } from './screen-engine.service';
import type {
  FilterCondition,
  ConflictInfo,
  ScreenResult,
  AiParseResult,
  ScreenDiff,
} from '@shared/api.interface';

interface ParseIntentDto {
  query: string;
}

interface ValidateDto {
  conditions: FilterCondition[];
}

interface RunScreenDto {
  conditions: FilterCondition[];
  poolCode?: string;
  poolName?: string;
}

interface DiffDto {
  conditionsA: FilterCondition[];
  conditionsB: FilterCondition[];
  poolCode?: string;
  poolName?: string;
  baseSnapshotId?: string;
}

@Controller('api/screen')
export class ScreenEngineController {
  private readonly logger = new Logger(ScreenEngineController.name);

  constructor(private readonly screenEngineService: ScreenEngineService) {}

  @Post('parse-intent')
  async parseIntent(@Body() body: ParseIntentDto): Promise<AiParseResult> {
    const { query } = body;
    if (!query || typeof query !== 'string') {
      throw new BadRequestException('缺少 query 参数');
    }
    return this.screenEngineService.parseIntent(query);
  }

  @Post('validate')
  async validate(
    @Body() body: ValidateDto,
  ): Promise<{ conflicts: ConflictInfo[]; valid: boolean }> {
    const { conditions } = body;
    if (!conditions || !Array.isArray(conditions)) {
      throw new BadRequestException('conditions 必须是数组');
    }
    return this.screenEngineService.validateConditions(conditions);
  }

  @Post('run')
  async run(@Body() body: RunScreenDto): Promise<ScreenResult> {
    const { conditions, poolCode, poolName } = body;
    if (!conditions || !Array.isArray(conditions)) {
      throw new BadRequestException('conditions 必须是数组');
    }
    return this.screenEngineService.runScreen(
      conditions,
      poolCode,
      poolName,
    );
  }

  @Post('diff')
  async diff(@Body() body: DiffDto): Promise<ScreenDiff> {
    const { conditionsA, conditionsB, poolCode, poolName, baseSnapshotId } = body;
    if (
      !conditionsA ||
      !Array.isArray(conditionsA) ||
      !conditionsB ||
      !Array.isArray(conditionsB)
    ) {
      throw new BadRequestException('conditionsA 和 conditionsB 必须是数组');
    }
    return this.screenEngineService.runDiff(
      conditionsA,
      conditionsB,
      poolCode,
      poolName,
      baseSnapshotId,
    );
  }
}
