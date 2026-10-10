import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Logger,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { StrategyService } from './strategy.service';
import type { Strategy, FilterCondition } from '@shared/api.interface';

interface CreateStrategyDto {
  name: string;
  description?: string;
  conditions: FilterCondition[];
  poolCode: string;
  poolName: string;
}

interface UpdateStrategyDto {
  name?: string;
  description?: string;
  conditions?: FilterCondition[];
  poolCode?: string;
  poolName?: string;
}

@NeedLogin()
@Controller('api/strategies')
export class StrategyController {
  private readonly logger = new Logger(StrategyController.name);

  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  async list(@Req() req: Request): Promise<Strategy[]> {
    const { userId } = req.userContext;
    return this.strategyService.list(userId);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request): Promise<Strategy> {
    const { userId } = req.userContext;
    return this.strategyService.getById(id, userId);
  }

  @Post()
  async create(
    @Body() body: CreateStrategyDto,
    @Req() req: Request,
  ): Promise<Strategy> {
    const { userId } = req.userContext;
    return this.strategyService.create(body, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateStrategyDto,
    @Req() req: Request,
  ): Promise<Strategy> {
    const { userId } = req.userContext;
    return this.strategyService.update(id, body, userId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.strategyService.delete(id, userId);
    return { success: true };
  }
}
