import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Plus, Play, Pencil, Trash2, Check, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@client/src/components/ui/alert';
import { Separator } from '@client/src/components/ui/separator';
import { validateConditions } from '@client/src/api/screen';
import ConditionEditor, { generateId } from './ConditionEditor';
import { OPERATOR_SYMBOL_MAP, FIELD_OPTIONS } from '../constants';
import type { FilterCondition, ConflictInfo } from '@shared/api.interface';

interface ConditionCardListProps {
  conditions: FilterCondition[];
  onConditionsChange: (conditions: FilterCondition[]) => void;
  onRunScreen: () => void;
  isScreening: boolean;
}

const ConditionCardList = ({
  conditions,
  onConditionsChange,
  onRunScreen,
  isScreening,
}: ConditionCardListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  const validateMutation = useMutation({
    mutationFn: (conds: FilterCondition[]) => validateConditions(conds),
    onSuccess: (data) => {
      setConflicts(data.conflicts);
    },
    onError: (error: Error) => {
      logger.error('条件校验失败', error);
    },
  });

  useEffect(() => {
    if (conditions.length > 0) {
      const timer = setTimeout(() => {
        validateMutation.mutate(conditions);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setConflicts([]);
    }
  }, [conditions]);

  const handleAddCondition = () => {
    const defaultField = FIELD_OPTIONS[0];
    const newCondition: FilterCondition = {
      id: generateId(),
      field: defaultField.value,
      fieldLabel: defaultField.label,
      operator: 'lt',
      value: 20,
      unit: defaultField.unit,
      window: defaultField.window,
      dataSource: defaultField.dataSource,
      confirmed: false,
    };
    onConditionsChange([...conditions, newCondition]);
    setEditingId(newCondition.id);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleDelete = (id: string) => {
    onConditionsChange(conditions.filter((c) => c.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleSave = (updated: FilterCondition) => {
    onConditionsChange(conditions.map((c) => (c.id === updated.id ? updated : c)));
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleConfirm = (id: string) => {
    onConditionsChange(
      conditions.map((c) => (c.id === id ? { ...c, confirmed: true } : c)),
    );
  };

  const hasErrors = conflicts.some((c) => c.severity === 'error');
  const hasUnconfirmed = conditions.some((c) => !c.confirmed);

  const formatValue = (cond: FilterCondition): string => {
    if (Array.isArray(cond.value)) {
      return `${cond.value[0]} ~ ${cond.value[1]}${cond.unit ? ' ' + cond.unit : ''}`;
    }
    return `${cond.value}${cond.unit ? ' ' + cond.unit : ''}`;
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <span>筛选条件</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {conditions.length} 条
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conditions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            暂无条件，从上方输入描述或点击下方按钮添加
          </div>
        ) : (
          <div className="space-y-2">
            {conditions.map((cond) => (
              <div
                key={cond.id}
                className={`rounded-md border p-3 transition-colors ${
                  cond.confirmed
                    ? 'border-border bg-card'
                    : 'border-primary/40 bg-primary/5'
                }`}
              >
                {editingId === cond.id ? (
                  <ConditionEditor
                    condition={cond}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {cond.fieldLabel}
                          </span>
                          {!cond.confirmed && (
                            <Badge
                              variant="outline"
                              className="h-4 border-primary/50 px-1 text-[10px] text-primary"
                            >
                              待确认
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-sm">
                          <span className="text-muted-foreground">
                            {OPERATOR_SYMBOL_MAP[cond.operator]}
                          </span>
                          <span className="text-foreground">{formatValue(cond)}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {cond.dataSource}
                          {cond.window ? ` · ${cond.window}` : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {!cond.confirmed && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-success hover:text-success"
                            onClick={() => handleConfirm(cond.id)}
                            aria-label="确认条件"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(cond.id)}
                          aria-label="编辑条件"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(cond.id)}
                          aria-label="删除条件"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {cond.description && (
                      <p className="mt-2 text-xs text-muted-foreground">{cond.description}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="space-y-2 pt-1">
            {conflicts.map((conflict, idx) => (
              <Alert
                key={idx}
                variant={conflict.severity === 'error' ? 'destructive' : 'warning'}
              >
                {conflict.severity === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle className="text-xs font-medium">
                  {conflict.severity === 'error' ? '逻辑冲突' : '风险提示'}
                </AlertTitle>
                <AlertDescription className="text-xs">{conflict.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={handleAddCondition}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            添加条件
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => {
              if (hasErrors) {
                toast.error('存在逻辑冲突，请先解决后再执行');
                return;
              }
              if (conditions.length === 0) {
                toast.warning('请先添加筛选条件');
                return;
              }
              if (hasUnconfirmed) {
                const unconfirmedCount = conditions.filter((c) => !c.confirmed).length;
                toast.warning(`还有 ${unconfirmedCount} 条条件待确认，请先确认后再筛选`);
                return;
              }
              onRunScreen();
            }}
            disabled={isScreening || conditions.length === 0 || hasErrors || hasUnconfirmed}
          >
            <Play className="mr-1.5 h-4 w-4" />
            {isScreening ? '筛选中…' : '开始筛选'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConditionCardList;
