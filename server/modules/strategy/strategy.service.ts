import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { sql } from 'drizzle-orm';
import type { Strategy, FilterCondition } from '@shared/api.interface';

interface StrategyRow {
  id: string;
  name: string;
  description: string | null;
  conditions: string;
  pool_code: string;
  pool_name: string;
  _created_at: string | Date;
  _updated_at: string | Date;
}

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private parseConditions(conditionsJson: string): FilterCondition[] {
    try {
      return JSON.parse(conditionsJson) as FilterCondition[];
    } catch {
      this.logger.warn('conditions 字段解析失败，返回空数组');
      return [];
    }
  }

  private rowToStrategy(row: StrategyRow): Strategy {
    const createdAt = row._created_at instanceof Date
      ? row._created_at.toISOString()
      : String(row._created_at);
    const updatedAt = row._updated_at instanceof Date
      ? row._updated_at.toISOString()
      : String(row._updated_at);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      conditions: this.parseConditions(row.conditions),
      poolCode: row.pool_code,
      poolName: row.pool_name,
      createdAt,
      updatedAt,
    };
  }

  async list(userId: string): Promise<Strategy[]> {
    const result = await this.db.execute(sql`
      SELECT id, name, description, conditions, pool_code, pool_name, _created_at, _updated_at
      FROM strategies
      WHERE (_created_by).user_id = ${userId}
      ORDER BY _updated_at DESC
    `);
    const rows = result as unknown as StrategyRow[];
    return rows.map((row: StrategyRow) => this.rowToStrategy(row));
  }

  async getById(id: string, userId: string): Promise<Strategy> {
    const result = await this.db.execute(sql`
      SELECT id, name, description, conditions, pool_code, pool_name, _created_at, _updated_at
      FROM strategies
      WHERE id = ${id} AND (_created_by).user_id = ${userId}
      LIMIT 1
    `);
    const rows = result as unknown as StrategyRow[];
    if (rows.length === 0) {
      throw new NotFoundException('策略不存在');
    }
    return this.rowToStrategy(rows[0]);
  }

  async create(
    data: {
      name: string;
      description?: string;
      conditions: FilterCondition[];
      poolCode: string;
      poolName: string;
    },
    userId: string,
  ): Promise<Strategy> {
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('策略名称不能为空');
    }
    if (!data.conditions || !Array.isArray(data.conditions)) {
      throw new BadRequestException('条件格式不正确');
    }
    const conditionsJson = JSON.stringify(data.conditions);

    const result = await this.db.execute(sql`
      INSERT INTO strategies (name, description, conditions, pool_code, pool_name, _created_by, _updated_by)
      VALUES (
        ${data.name.trim()},
        ${data.description ?? null},
        ${conditionsJson},
        ${data.poolCode},
        ${data.poolName},
        ROW(${userId})::user_profile,
        ROW(${userId})::user_profile
      )
      RETURNING id, name, description, conditions, pool_code, pool_name, _created_at, _updated_at
    `);
    const rows = result as unknown as StrategyRow[];
    return this.rowToStrategy(rows[0]);
  }

  async update(
    id: string,
    patch: {
      name?: string;
      description?: string;
      conditions?: FilterCondition[];
      poolCode?: string;
      poolName?: string;
    },
    userId: string,
  ): Promise<Strategy> {
    if (patch.name !== undefined && patch.name.trim().length === 0) {
      throw new BadRequestException('策略名称不能为空');
    }
    if (patch.conditions !== undefined && !Array.isArray(patch.conditions)) {
      throw new BadRequestException('条件格式不正确');
    }

    // 检查记录是否存在
    const existResult = await this.db.execute(sql`
      SELECT id FROM strategies
      WHERE id = ${id} AND (_created_by).user_id = ${userId}
      LIMIT 1
    `);
    const existRows = existResult as unknown as { id: string }[];
    if (existRows.length === 0) {
      throw new NotFoundException('策略不存在');
    }

    // 逐字段更新，保持所有字段都通过 sql 模板参数化
    const conditionsJson = patch.conditions
      ? JSON.stringify(patch.conditions)
      : null;

    // 使用单个 UPDATE 语句，通过 COALESCE 实现部分更新
    const result = await this.db.execute(sql`
      UPDATE strategies
      SET
        name = COALESCE(
          ${patch.name !== undefined ? patch.name.trim() : null},
          name
        ),
        description = CASE
          WHEN ${patch.description !== undefined} THEN ${patch.description ?? null}
          ELSE description
        END,
        conditions = COALESCE(
          ${conditionsJson ? conditionsJson : null},
          conditions
        ),
        pool_code = COALESCE(
          ${patch.poolCode ?? null},
          pool_code
        ),
        pool_name = COALESCE(
          ${patch.poolName ?? null},
          pool_name
        ),
        _updated_at = CURRENT_TIMESTAMP,
        _updated_by = ROW(${userId})::user_profile
      WHERE id = ${id} AND (_created_by).user_id = ${userId}
      RETURNING id, name, description, conditions, pool_code, pool_name, _created_at, _updated_at
    `);
    const rows = result as unknown as StrategyRow[];
    return this.rowToStrategy(rows[0]);
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.db.execute(sql`
      DELETE FROM strategies
      WHERE id = ${id} AND (_created_by).user_id = ${userId}
      RETURNING id
    `);
    const rows = result as unknown as { id: string }[];
    if (rows.length === 0) {
      throw new NotFoundException('策略不存在');
    }
  }
}
