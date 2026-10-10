import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync, lstatSync, constants as fsConstants } from 'fs';
import * as path from 'path';
import * as os from 'os';

const DEV_SECRET_FILE = path.join(os.homedir(), '.miaoda-dev-secrets', 'fuyao-api-key');

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  private fuyaoApiKey: string | null = null;
  private fuyaoKeySource: 'env' | 'devfile' | 'none' = 'none';

  constructor() {
    const envKey = process.env.FUYAO_API_KEY;
    if (envKey) {
      this.fuyaoApiKey = envKey;
      this.fuyaoKeySource = 'env';
      this.logger.log('扶摇 API Key 已从环境变量加载');
      return;
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      this.fuyaoApiKey = this.loadDevSecretFile();
      if (this.fuyaoApiKey) {
        this.fuyaoKeySource = 'devfile';
        this.logger.log(`扶摇 API Key 已从开发密钥文件加载 (${DEV_SECRET_FILE})`);
      }
    }
  }

  private loadDevSecretFile(): string | null {
    try {
      if (!existsSync(DEV_SECRET_FILE)) return null;

      const stat = lstatSync(DEV_SECRET_FILE);
      if (stat.isSymbolicLink()) {
        this.logger.warn('开发密钥文件是符号链接，已忽略以保证安全');
        return null;
      }
      const mode = stat.mode & 0o777;
      if (mode !== 0o600) {
        this.logger.warn(`开发密钥文件权限 ${mode.toString(8)} 不是 600，已忽略`);
        return null;
      }

      const content = readFileSync(DEV_SECRET_FILE, 'utf-8');
      const key = content.trim();
      return key.length > 0 ? key : null;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      this.logger.warn(`读取开发密钥文件失败: ${e.code ?? e.message}`);
      return null;
    }
  }

  getFuyaoApiKey(): string | null {
    return this.fuyaoApiKey;
  }

  getFuyaoApiKeySource(): 'env' | 'devfile' | 'none' {
    return this.fuyaoKeySource;
  }

  isFuyaoConfigured(): boolean {
    return this.fuyaoApiKey !== null && this.fuyaoApiKey.length > 0;
  }

  isAiConfigured(): boolean {
    return this.getAiParseInstanceId() !== null;
  }

  getAiParseInstanceId(): string | null {
    const envVal = process.env.AI_PARSE_INSTANCE_ID;
    if (envVal && envVal.length > 0) return envVal;
    const DEFAULT_AI_PARSE_INSTANCE = 'ai-stock-screen-parser';
    return DEFAULT_AI_PARSE_INSTANCE;
  }
}
