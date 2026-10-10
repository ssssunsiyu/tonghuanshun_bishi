import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FuyaoDataController } from './fuyao-data.controller';
import { FuyaoDataService } from './fuyao-data.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://fuyao.aicubes.cn',
      timeout: 30000,
    }),
  ],
  controllers: [FuyaoDataController],
  providers: [FuyaoDataService],
  exports: [FuyaoDataService],
})
export class FuyaoDataModule {}
