import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractApiErrorMessage } from './utils';
import type {
  AiParseResult,
  ScreenResult,
  ScreenDiff,
  FilterCondition,
  ConflictInfo,
} from '@shared/api.interface';

export async function parseIntent(query: string): Promise<AiParseResult> {
  try {
    const response = await axiosForBackend.post('/api/screen/parse-intent', { query });
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

export async function validateConditions(
  conditions: FilterCondition[],
): Promise<{ conflicts: ConflictInfo[]; valid: boolean }> {
  try {
    const response = await axiosForBackend.post('/api/screen/validate', { conditions });
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

export async function runScreen(
  conditions: FilterCondition[],
  poolCode: string,
): Promise<ScreenResult> {
  try {
    const response = await axiosForBackend.post('/api/screen/run', { conditions, poolCode });
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

export async function compareScreen(
  conditionsA: FilterCondition[],
  conditionsB: FilterCondition[],
  poolCode: string,
  baseSnapshotId?: string,
): Promise<ScreenDiff> {
  try {
    const response = await axiosForBackend.post('/api/screen/diff', {
      conditionsA,
      conditionsB,
      poolCode,
      baseSnapshotId,
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}
