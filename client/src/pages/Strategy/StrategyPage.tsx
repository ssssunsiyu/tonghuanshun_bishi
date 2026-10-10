import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Save,
  Play,
  Trash2,
  Edit3,
  Calendar,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Input } from '@client/src/components/ui/input';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@client/src/components/ui/empty';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import { listStrategies, deleteStrategy, updateStrategy } from '@client/src/api/strategy';
import { useState } from 'react';
import type { Strategy } from '@shared/api.interface';

const StrategyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Strategy | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: listStrategies,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStrategy(id),
    onSuccess: (_, id) => {
      logger.info('策略已删除', id);
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast.success('策略已删除');
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      logger.error('删除策略失败', error);
      toast.error(`删除失败：${error.message || '请稍后重试'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: string; name: string; description?: string }) =>
      updateStrategy(id, { name, description }),
    onSuccess: () => {
      logger.info('策略已更新');
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast.success('策略已更新');
      setEditingStrategy(null);
    },
    onError: (error: Error) => {
      logger.error('更新策略失败', error);
      toast.error(`更新失败：${error.message || '请稍后重试'}`);
    },
  });

  const handleApply = (strategy: Strategy) => {
    // 将策略条件存入 sessionStorage，选股页读取后跳转
    sessionStorage.setItem('apply_strategy', JSON.stringify(strategy));
    navigate('/');
    toast.success(`已应用策略「${strategy.name}」`);
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setEditName(strategy.name);
    setEditDescription(strategy.description || '');
  };

  const handleSaveEdit = () => {
    if (!editingStrategy || !editName.trim()) return;
    updateMutation.mutate({
      id: editingStrategy.id,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">我的策略</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              保存的选股条件模板，一键应用到选股器
            </p>
          </div>
          <Badge variant="secondary">
            {strategies ? strategies.length : 0} 个策略
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !strategies || strategies.length === 0 ? (
          <Empty className="min-h-[50vh]">
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Save className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>还没有保存的策略</EmptyTitle>
                <EmptyDescription>
                  在选股器中配置好条件后，点击「保存策略」即可保存到这里
                </EmptyDescription>
              </EmptyHeader>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {strategies.map((strategy) => (
              <Card
                key={strategy.id}
                className="group flex flex-col border-border transition-colors hover:border-primary/40"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium">
                      {strategy.name}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {strategy.conditions.length} 条件
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 text-xs">
                    {strategy.description || '暂无描述'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.conditions.slice(0, 4).map((cond) => (
                      <Badge
                        key={cond.id}
                        variant="outline"
                        className="h-5 px-1.5 text-[10px]"
                      >
                        {cond.fieldLabel}
                      </Badge>
                    ))}
                    {strategy.conditions.length > 4 && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        +{strategy.conditions.length - 4}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Filter className="h-3 w-3" />
                      {strategy.poolName}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(strategy.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApply(strategy)}
                    >
                      <Play className="mr-1 h-3.5 w-3.5" />
                      应用
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => handleEdit(strategy)}
                      aria-label="编辑策略名称"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setDeleteTarget(strategy)}
                      aria-label="删除策略"
                      className="hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border border-border bg-background">
          <AlertDialogTitle>确认删除策略</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除策略「{deleteTarget?.name}」吗？此操作不可撤销。
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑名称 */}
      <Dialog
        open={!!editingStrategy}
        onOpenChange={(o) => !o && setEditingStrategy(null)}
      >
        <DialogContent className="border border-border bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑策略</DialogTitle>
            <DialogDescription>修改策略名称和描述</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">策略名称</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">描述（可选）</Label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[80px] w-full resize-none rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="简要描述选股逻辑…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingStrategy(null)}>
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !editName.trim()}
            >
              {updateMutation.isPending ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StrategyPage;
