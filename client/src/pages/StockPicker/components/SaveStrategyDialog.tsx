import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Label } from '@client/src/components/ui/label';
import { createStrategy } from '@client/src/api/strategy';
import type { FilterCondition } from '@shared/api.interface';

interface SaveStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conditions: FilterCondition[];
  poolCode: string;
  poolName: string;
  onSaved?: () => void;
}

const SaveStrategyDialog = ({
  open,
  onOpenChange,
  conditions,
  poolCode,
  poolName,
  onSaved,
}: SaveStrategyDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const saveMutation = useMutation({
    mutationFn: () =>
      createStrategy({
        name: name.trim(),
        description: description.trim() || undefined,
        conditions,
        poolCode,
        poolName,
      }),
    onSuccess: () => {
      logger.info('策略保存成功', name);
      toast.success('策略已保存');
      setName('');
      setDescription('');
      onOpenChange(false);
      onSaved?.();
    },
    onError: (error: Error) => {
      logger.error('策略保存失败', error);
      toast.error(`保存失败：${error.message || '请稍后重试'}`);
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.warning('请输入策略名称');
      return;
    }
    if (conditions.length === 0) {
      toast.warning('暂无筛选条件可保存');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            保存策略
          </DialogTitle>
          <DialogDescription>
            将当前 {conditions.length} 个筛选条件保存为策略，便于后续复用
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="strategy-name" className="text-xs text-muted-foreground">
              策略名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="strategy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：低估值高成长"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="strategy-desc" className="text-xs text-muted-foreground">
              策略描述（可选）
            </Label>
            <Textarea
              id="strategy-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述选股逻辑…"
              className="min-h-[80px] resize-none text-sm"
            />
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>股票池：{poolName}</p>
            <p className="mt-1">条件数量：{conditions.length} 条</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !name.trim()}
          >
            {saveMutation.isPending ? '保存中…' : '保存策略'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveStrategyDialog;
