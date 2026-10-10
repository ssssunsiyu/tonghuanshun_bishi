import { X, Check, XCircle, HelpCircle, Building2, TrendingUp, Calculator } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@client/src/components/ui/drawer';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Separator } from '@client/src/components/ui/separator';
import { ScrollArea } from '@client/src/components/ui/scroll-area';
import type { ScreenedStock, ConditionResult, ScreenStatus } from '@shared/api.interface';
import { OPERATOR_SYMBOL_MAP } from '../constants';

interface StockDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: ScreenedStock | null;
}

const statusLabel: Record<ScreenStatus, string> = {
  included: '入选',
  excluded: '排除',
  unknown: '无法判断',
};

const StockDetailDrawer = ({ open, onOpenChange, stock }: StockDetailDrawerProps) => {
  const getStatusIcon = (status: ScreenStatus) => {
    switch (status) {
      case 'included':
        return <Check className="h-4 w-4 text-success" />;
      case 'excluded':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatThreshold = (result: ConditionResult): string => {
    const op = OPERATOR_SYMBOL_MAP[result.operator];
    const unit = result.unit || '';
    if (Array.isArray(result.threshold)) {
      return `${result.threshold[0]} ~ ${result.threshold[1]}${unit}`;
    }
    return `${op} ${result.threshold}${unit}`;
  };

  const formatActual = (result: ConditionResult): string => {
    if (result.actualValue === null) return '—';
    return `${result.actualValue.toFixed(2)}${result.unit || ''}`;
  };

  if (!stock) return null;

  return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-w-lg border-l border-border bg-background">
        <DrawerHeader className="border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                {stock.name}
                <span className="font-mono text-sm font-normal text-muted-foreground">
                  {stock.ticker}
                </span>
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                股票代码：{stock.thscode}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="关闭">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge
              variant={
                stock.overallStatus === 'included'
                  ? 'default'
                  : stock.overallStatus === 'excluded'
                    ? 'destructive'
                    : 'outline'
              }
              className="text-xs"
            >
              {statusLabel[stock.overallStatus]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {stock.includedCount}/{stock.conditionResults.length} 个条件通过
            </span>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                逐条件判定
              </h3>
              <div className="space-y-2">
                {stock.conditionResults.map((result) => (
                  <div
                    key={result.conditionId}
                    className={`rounded-md border p-3 ${
                      result.status === 'included'
                        ? 'border-success/30 bg-success/5'
                        : result.status === 'excluded'
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="text-sm font-medium">{result.fieldLabel}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span className="text-muted-foreground">阈值：</span>
                            <span className="font-mono">{formatThreshold(result)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">实际值：</span>
                            <span
                              className={`font-mono ${
                                result.status === 'included'
                                  ? 'text-success'
                                  : result.status === 'excluded'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {formatActual(result)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {result.reason && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        判定依据：{result.reason}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      数据来源：扶摇 · 数据时点：最近交易日
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Calculator className="h-4 w-4 text-primary" />
                关键指标一览
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {stock.conditionResults.map((r) => (
                  <div
                    key={r.conditionId}
                    className="rounded-md border border-border bg-card p-2"
                  >
                    <div className="text-muted-foreground">{r.fieldLabel}</div>
                    <div className="mt-0.5 font-mono text-sm font-medium">
                      {r.actualValue !== null
                        ? `${r.actualValue.toFixed(2)}${r.unit || ''}`
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default StockDetailDrawer;
