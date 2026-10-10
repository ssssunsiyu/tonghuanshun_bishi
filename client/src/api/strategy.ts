import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractApiErrorMessage } from './utils';
import type { Strategy } from '@shared/api.interface';

export async function listStrategies(): Promise<Strategy[]> {
  try {
    const response = await axiosForBackend.get('/api/strategies');
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

export async function getStrategy(id: string): Promise<Strategy> {
  try {
    const response = await axiosForBackend.get(`/api/strategies/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

export async function createStrategy(
  data: Pick<Strategy, 'name' | 'description' | 'conditions' | 'poolCode' | 'poolName'>,
): Promise<Strategy> {
  try {
    const response = await axiosForBackend.post('/api/strategies', data);
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

export async function updateStrategy(
  id: string,
  data: Partial<Pick<Strategy, 'name' | 'description' | 'conditions' | 'poolCode' | 'poolName'>>,
): Promise<Strategy> {
  try {
    const response = await axiosForBackend.patch(`/api/strategies/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

export async function deleteStrategy(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/strategies/${id}`);
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}
