const FUYAO_KEY_ERROR_MSG = '扶摇 API Key 未配置，请先在配置页设置';
const FUYAO_AUTH_ERROR_MSG_PREFIX = '扶摇数据服务鉴权失败';
const FUYAO_GENERIC_ERROR_MSG = '扶摇数据服务调用失败';

export function checkFuyaoKeyAvailable(apiKey: string | null | undefined): {
  ok: boolean;
  error: string | null;
} {
  if (!apiKey || apiKey.trim().length === 0) {
    return { ok: false, error: FUYAO_KEY_ERROR_MSG };
  }
  return { ok: true, error: null };
}

export function classifyFuyaoHttpError(status: number | undefined, bodyCode?: number): {
  type: 'auth' | 'business' | 'network' | 'unknown';
  message: string;
} {
  if (status === 401 || status === 403) {
    return {
      type: 'auth',
      message: `${FUYAO_AUTH_ERROR_MSG_PREFIX} (HTTP ${status})`,
    };
  }
  if (bodyCode !== undefined && bodyCode !== 0) {
    return {
      type: 'business',
      message: `扶摇数据服务业务错误 (code=${bodyCode})`,
    };
  }
  if (status === undefined || status === 0) {
    return { type: 'network', message: `${FUYAO_GENERIC_ERROR_MSG}: 网络连接失败` };
  }
  return { type: 'unknown', message: `${FUYAO_GENERIC_ERROR_MSG}: HTTP ${status}` };
}
