import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  KeyRound,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
  Server,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@client/src/components/ui/alert';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Separator } from '@client/src/components/ui/separator';
import { getConfigStatus } from '@client/src/api/config';
import type { DataConfigStatus } from '@shared/api.interface';

const ConfigPage = () => {
  const { data: status, isLoading } = useQuery<DataConfigStatus>({
    queryKey: ['config-status'],
    queryFn: getConfigStatus,
  });

  const sourceLabel = (source: string | undefined) => {
    switch (source) {
      case 'env':
        return { text: '环境变量', variant: 'default' as const };
      case 'devfile':
        return { text: '开发密钥文件', variant: 'secondary' as const };
      default:
        return { text: '未配置', variant: 'outline' as const };
    }
  };

  const StatusBadge = ({ configured }: { configured: boolean }) => (
    <Badge
      variant={configured ? 'default' : 'secondary'}
      className={configured ? '' : 'bg-muted text-muted-foreground'}
    >
      {configured ? (
        <>
          <CheckCircle2 className="mr-1 h-3 w-3" />
          已配置
        </>
      ) : (
        <>
          <XCircle className="mr-1 h-3 w-3" />
          未配置
        </>
      )}
    </Badge>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">服务配置状态</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看金融数据源与 AI 解析服务的连接状态
          </p>
        </div>

        <Alert variant="default" className="mb-6 border-primary/30 bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle className="text-sm font-medium text-primary">安全说明</AlertTitle>
          <AlertDescription className="text-xs">
            所有服务密钥仅从服务端环境变量读取，不在前端展示、不通过网页输入、不写入数据库。
            数据请求均经过服务端代理，密钥由服务端注入。
          </AlertDescription>
        </Alert>

        {/* 扶摇数据服务 */}
        <Card className="mb-4 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">扶摇数据服务</CardTitle>
                  <CardDescription className="text-xs">
                    沪深300行情、估值、财务数据来源
                  </CardDescription>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <StatusBadge configured={!!status?.fuyaoConfigured} />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">环境变量：</span>
              <code className="font-mono text-xs font-medium">
                {status?.fuyaoKeyEnv ?? 'FUYAO_API_KEY'}
              </code>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Server className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">加载来源：</span>
              <Badge variant={sourceLabel(status?.fuyaoKeySource).variant} className="text-xs">
                {sourceLabel(status?.fuyaoKeySource).text}
              </Badge>
            </div>

            {!status?.fuyaoConfigured && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs font-medium">未配置</AlertTitle>
                <AlertDescription className="text-xs">
                  扶摇 API Key 未设置，筛选功能不可用。请在服务部署环境中配置
                  <code className="mx-1 font-mono">{status?.fuyaoKeyEnv ?? 'FUYAO_API_KEY'}</code>
                  环境变量。
                </AlertDescription>
              </Alert>
            )}

            {status?.fuyaoConfigured && (
              <Alert className="border-success/50 bg-success/10 py-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle className="text-xs font-medium text-success-foreground">
                  服务可用
                </AlertTitle>
                <AlertDescription className="text-xs text-success-foreground/80">
                  扶摇数据服务已连接，可执行选股筛选。
                </AlertDescription>
              </Alert>
            )}

             <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
               <Server className="mt-0.5 h-3 w-3 flex-shrink-0" />
               <p>
                 生产环境通过 <code className="font-mono">FUYAO_API_KEY</code> 环境变量配置；
                 开发环境可使用本地私密文件 <code className="font-mono">~/.miaoda-dev-secrets/fuyao-api-key</code>（仅 600 权限，非符号链接）。
               </p>
             </div>
          </CardContent>
        </Card>

        <Separator />

        {/* AI 解析服务 */}
        <Card className="mt-4 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">AI 解析服务</CardTitle>
                  <CardDescription className="text-xs">
                    自然语言 → 结构化选股条件
                  </CardDescription>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <StatusBadge configured={!!status?.aiConfigured} />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">环境变量：</span>
              <code className="font-mono text-xs font-medium">
                {status?.aiEnv ?? 'AI_PARSE_INSTANCE_ID'}
              </code>
            </div>

            {!status?.aiConfigured && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs font-medium">未配置</AlertTitle>
                <AlertDescription className="text-xs">
                  AI 意图解析服务未启用。您仍可手动添加选股条件，或在服务端配置
                  <code className="mx-1 font-mono">{status?.aiEnv ?? 'AI_PARSE_INSTANCE_ID'}</code>
                  环境变量以启用自然语言解析。
                </AlertDescription>
              </Alert>
            )}

            {status?.aiConfigured && (
              <Alert className="border-success/50 bg-success/10 py-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle className="text-xs font-medium text-success-foreground">
                  服务可用
                </AlertTitle>
                <AlertDescription className="text-xs text-success-foreground/80">
                  AI 自然语言解析已启用。
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Server className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <p>
                配置方式：创建「AI 文本转 JSON」插件实例后，将实例 ID 配置到
                <code className="mx-1 font-mono">AI_PARSE_INSTANCE_ID</code> 环境变量。
              </p>
            </div>
          </CardContent>
        </Card>

        {status?.lastChecked && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            最近检测：{new Date(status.lastChecked).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConfigPage;
