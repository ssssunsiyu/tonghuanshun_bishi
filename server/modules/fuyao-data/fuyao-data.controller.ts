import { Controller, Get, Query, BadRequestException, Logger } from '@nestjs/common';
import { FuyaoDataService } from './fuyao-data.service';
import type {
  StockBasic,
  StockPrice,
  StockValuation,
  StockFinancial,
} from '@shared/api.interface';

@Controller('api/fuyao-data')
export class FuyaoDataController {
  private readonly logger = new Logger(FuyaoDataController.name);

  constructor(private readonly fuyaoDataService: FuyaoDataService) {}

  @Get('index-constituents')
  async getIndexConstituents(
    @Query('thscode') thscode: string,
  ): Promise<StockBasic[]> {
    if (!thscode) {
      throw new BadRequestException('缺少 thscode 参数');
    }
    return this.fuyaoDataService.getIndexConstituents(thscode);
  }

  @Get('price-snapshot')
  async getPriceSnapshot(
    @Query('thscodes') thscodes: string,
  ): Promise<StockPrice[]> {
    if (!thscodes) {
      throw new BadRequestException('缺少 thscodes 参数');
    }
    const codeList = thscodes.split(',').map((s: string) => s.trim()).filter(Boolean);
    return this.fuyaoDataService.getPriceSnapshot(codeList);
  }

  @Get('valuation-snapshot')
  async getValuationSnapshot(
    @Query('thscodes') thscodes: string,
  ): Promise<StockValuation[]> {
    if (!thscodes) {
      throw new BadRequestException('缺少 thscodes 参数');
    }
    const codeList = thscodes.split(',').map((s: string) => s.trim()).filter(Boolean);
    return this.fuyaoDataService.getValuationSnapshot(codeList);
  }

  @Get('financial-indicators')
  async getFinancialIndicators(
    @Query('thscode') thscode: string,
    @Query('report') report: string,
  ): Promise<StockFinancial> {
    if (!thscode || !report) {
      throw new BadRequestException('缺少 thscode 或 report 参数');
    }
    return this.fuyaoDataService.getFinancialIndicators(thscode, report);
  }

  @Get('historical-prices')
  async getHistoricalPrices(
    @Query('thscode') thscode: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('interval') interval?: string,
  ): Promise<Array<{ dateMs: number; close: number | null }>> {
    if (!thscode || !start || !end) {
      throw new BadRequestException('缺少 thscode、start 或 end 参数');
    }
    const startMs = Number(start);
    const endMs = Number(end);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw new BadRequestException('start 和 end 必须是 Unix 毫秒整数');
    }
    return this.fuyaoDataService.getHistoricalPrices(
      thscode,
      startMs,
      endMs,
      interval,
    );
  }
}
