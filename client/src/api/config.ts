import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractApiErrorMessage } from './utils';
import type { DataConfigStatus } from '@shared/api.interface';

export async function getConfigStatus(): Promise<DataConfigStatus> {
  try {
    const response = await axiosForBackend.get('/api/config/status');
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}
