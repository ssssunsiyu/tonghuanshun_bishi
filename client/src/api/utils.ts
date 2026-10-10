export function extractApiErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };
  if (err.response?.data?.error?.message) {
    return err.response.data.error.message;
  }
  return err.message || '请求失败，请稍后重试';
}
