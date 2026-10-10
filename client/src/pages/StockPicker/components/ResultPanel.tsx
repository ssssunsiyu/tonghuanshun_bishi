import { useState, useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@client/src/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from '@client/src/components/ui/empty';
import { ScrollArea } from '@client/src/components/ui/scroll-area';
import { Separator } from '@client/src/components/ui/separator';
import { Database, Clock, Check, X, HelpCircle, GitCompare, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ScreenResult, ScreenedStock, ScreenStatus, ScreenDiff } from '@shared/api.interface';

interface ResultPanelProps {
  result: ScreenResult | null;
  diff: ScreenDiff | null;
  isLoading: boolean;
  error: string | null;
  selectedStock: ScreenedStock | null;
  onSelectStock: (stock: ScreenedStock) => void;
  compareList: ScreenedStock[];
  onToggleCompare: (stock: ScreenedStock) => void;
  onOpenCompare: () => void;
}

const statusLabel: Record<ScreenStatus, string> = {
  included: '入选',
  excluded: '排除',
  unknown: '无法判断',
};

const statusColor: Record<ScreenStatus, string> = {
  included: 'text-success',
  excluded: 'text-destructive',
  unknown: 'text-muted-foreground',
};

const statusBadgeVariant: Record<ScreenStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  included: 'default',
  excluded: 'destructive',
  unknown: 'outline',
};

const formatTime = (ts: number | null): string => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPriceChange = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

const ResultPanel = ({
  result,
  diff,
  isLoading,
  error,
  selectedStock,
  onSelectStock,
  compareList,
  onToggleCompare,
  onOpenCompare,
}: ResultPanelProps) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredStocks = useMemo(() => {
    if (!result) return [];
    if (diff) {
      if (activeTab === 'added') return diff.added;
      if (activeTab === 'removed') return diff.removed;
      if (activeTab === 'unchanged') return diff.unchanged;
    }
    if (activeTab === 'all') return result.stocks;
    return result.stocks.filter((s) => s.overallStatus === activeTab);
  }, [result, activeTab, diff]);

  const isInCompare = (stock: ScreenedStock): boolean => {
    return compareList.some((s) => s.thscode === stock.thscode);
  };

  const getStatusIcon = (status: ScreenStatus) => {
    switch (status) {
      case 'included':
        return <Check className="h-3.5 w-3.5 text-success" />;
      case 'excluded':
        return <X className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getPriceChangeClass = (stock: ScreenedStock): string => {
    const price = stock.conditionResults.find((c) => c.field === 'price_change_ratio');
    if (!price || price.actualValue === null) return 'text-muted-foreground';
    return price.actualValue >= 0 ? 'text-up' : 'text-down';
  };

  const getPriceChangeValue = (stock: ScreenedStock): string => {
    const price = stock.conditionResults.find((c) => c.field === 'price_change_ratio');
    if (!price || price.actualValue === null) return '—';
    return formatPriceChange(price.actualValue);
  };

  const getPeValue = (stock: ScreenedStock): string => {
    const pe = stock.conditionResults.find((c) => c.field === 'pe_ttm');
    if (!pe || pe.actualValue === null) return '—';
    return pe.actualValue.toFixed(2);
  };

  return (
    <Card className="flex h-full flex-col border border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            筛选结果
            {result && (
              <Badge variant="secondary" className="font-mono text-xs">
                {result.totalPool} 只标的
              </Badge>
            )}
          </CardTitle>
          {compareList.length > 0 && (
            <Button variant="secondary" size="sm" onClick={onOpenCompare}>
              <GitCompare className="mr-1.5 h-4 w-4" />
              对比 ({compareList.length})
            </Button>
          )}
        </div>

        {result && (
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-md bg-muted/50 p-2">
              <div className="font-mono text-lg font-semibold text-foreground">
                {result.totalPool}
              </div>
              <div className="text-[11px] text-muted-foreground">总股票池</div>
            </div>
            <div className="rounded-md bg-success/10 p-2">
              <div className="font-mono text-lg font-semibold text-success">
                {result.included}
              </div>
              <div className="text-[11px] text-success/80">入选</div>
            </div>
            <div className="rounded-md bg-destructive/10 p-2">
              <div className="font-mono text-lg font-semibold text-destructive">
                {result.excluded}
              </div>
              <div className="text-[11px] text-destructive/80">排除</div>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <div className="font-mono text-lg font-semibold text-muted-foreground">
                {result.unknown}
              </div>
              <div className="text-[11px] text-muted-foreground">无法判断</div>
            </div>
          </div>
        )}

        {result && diff && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">条件变更：</span>
            <span className="text-success">
              <ArrowUp className="mr-0.5 inline h-3 w-3" />
              新增 {diff.added.length} 只
            </span>
            <span className="text-destructive">
              <ArrowDown className="mr-0.5 inline h-3 w-3" />
              移除 {diff.removed.length} 只
            </span>
            <span className="text-muted-foreground">未变 {diff.unchanged.length} 只</span>
            <span className={`ml-auto flex items-center gap-1 font-mono ${diff.snapshotReused ? 'text-success' : 'text-warning'}`}>
              {diff.snapshotReused ? '快照已复用' : '新数据快照'}
            </span>
          </div>
        )}

        {result && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              {result.dataSnapshot.poolName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              行情：{formatTime(result.dataSnapshot.priceTimestamp)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              财报：{result.dataSnapshot.financialReportPeriod || '—'}
            </span>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex flex-1 flex-col p-0">
        <div className="px-4 pt-3">
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={(val) => val && setActiveTab(val)}
              variant="outline"
            >
              <ToggleGroupItem value="all" className="text-xs">
                全部 {result ? `(${result.totalPool})` : ''}
              </ToggleGroupItem>
              <ToggleGroupItem value="included" className="text-xs">
                入选 {result ? `(${result.included})` : ''}
              </ToggleGroupItem>
              <ToggleGroupItem value="excluded" className="text-xs">
                排除 {result ? `(${result.excluded})` : ''}
              </ToggleGroupItem>
              <ToggleGroupItem value="unknown" className="text-xs">
                无法判断 {result ? `(${result.unknown})` : ''}
              </ToggleGroupItem>
              {diff && (
                <>
                  <ToggleGroupItem value="added" className="text-xs text-success">
                    新增 ({diff.added.length})
                  </ToggleGroupItem>
                  <ToggleGroupItem value="removed" className="text-xs text-destructive">
                    移除 ({diff.removed.length})
                  </ToggleGroupItem>
                  <ToggleGroupItem value="unchanged" className="text-xs">
                    未变 ({diff.unchanged.length})
                  </ToggleGroupItem>
                </>
              )}
            </ToggleGroup>
        </div>

        <div className="flex-1 overflow-hidden px-4 py-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <Empty className="h-full">
              <EmptyContent>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <EmptyHeader>
                  <EmptyTitle className="text-destructive">筛选失败</EmptyTitle>
                  <EmptyDescription className="mt-2 whitespace-pre-wrap text-destructive/80">
                    {error}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : !result ? (
            <Empty className="h-full">
              <EmptyContent>
                <EmptyHeader>
                  <EmptyTitle>暂无筛选结果</EmptyTitle>
                  <EmptyDescription>
                    在左侧添加筛选条件并点击「开始筛选」
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : filteredStocks.length === 0 ? (
            <Empty className="h-full">
              <EmptyContent>
                <EmptyHeader>
                  <EmptyTitle>无符合条件的股票</EmptyTitle>
                  <EmptyDescription>切换分类查看，或调整筛选条件</EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <ScrollArea className="h-full pr-2">
              <div className="space-y-1.5">
                {filteredStocks.map((stock) => {
                  const selected = selectedStock?.thscode === stock.thscode;
                  const inCompare = isInCompare(stock);
                  return (
                    <div
                      key={stock.thscode}
                      className={`group flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                        selected
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border hover:border-primary/30 hover:bg-accent/40'
                      }`}
                      onClick={() => onSelectStock(stock)}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <Checkbox
                          checked={inCompare}
                          onCheckedChange={() => onToggleCompare(stock)}
                          aria-label={`将 ${stock.name} 加入对比`}
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {stock.name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {stock.ticker}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>
                              PE: <span className="font-mono">{getPeValue(stock)}</span>
                            </span>
                            <span className={getPriceChangeClass(stock)}>
                              涨跌:{' '}
                              <span className="font-mono">
                                {getPriceChangeValue(stock)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex flex-col items-end text-[11px]">
                            <span className={statusColor[stock.overallStatus]}>
                              {stock.includedCount}/{stock.conditionResults.length} 通过
                            </span>
                          </div>
                          <Badge
                            variant={statusBadgeVariant[stock.overallStatus]}
                            className="h-5 text-[10px]"
                          >
                            {getStatusIcon(stock.overallStatus)}
                            <span className="ml-1">
                              {statusLabel[stock.overallStatus]}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultPanel;
