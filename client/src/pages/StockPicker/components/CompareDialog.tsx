import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Badge } from '@client/src/components/ui/badge';
import { X } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import type { ScreenedStock, ScreenStatus } from '@shared/api.interface';

interface CompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compareList: ScreenedStock[];
  onRemove: (thscode: string) => void;
}

interface MetricRow {
  key: string;
  label: string;
  unit: string;
}

const METRICS: MetricRow[] = [
  { key: 'pe_ttm', label: 'PE(TTM)', unit: '倍' },
  { key: 'pb_mrq', label: 'PB(MRQ)', unit: '倍' },
  { key: 'revenue_yoy', label: '营收同比增速', unit: '%' },
  { key: 'net_profit_yoy', label: '归母净利润同比增速', unit: '%' },
  { key: 'roe_deduct', label: '扣非ROE', unit: '%' },
  { key: 'price_change_ratio', label: '涨跌幅', unit: '%' },
  { key: 'volatility_20d', label: '20日波动率', unit: '%' },
];

const statusLabel: Record<ScreenStatus, string> = {
  included: '入选',
  excluded: '排除',
  unknown: '未知',
};

const CompareDialog = ({ open, onOpenChange, compareList, onRemove }: CompareDialogProps) => {
  const getValue = (stock: ScreenedStock, fieldKey: string): string => {
    const result = stock.conditionResults.find((c) => c.field === fieldKey);
    if (!result || result.actualValue === null) return '—';
    return `${result.actualValue.toFixed(2)}${result.unit || ''}`;
  };

  const isPriceChange = (key: string): boolean => key === 'price_change_ratio';

  const getValueColor = (stock: ScreenedStock, fieldKey: string): string => {
    if (!isPriceChange(fieldKey)) return '';
    const result = stock.conditionResults.find((c) => c.field === fieldKey);
    if (!result || result.actualValue === null) return 'text-muted-foreground';
    return result.actualValue >= 0 ? 'text-up' : 'text-down';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border border-border bg-background">
        <DialogHeader>
          <DialogTitle>股票对比</DialogTitle>
          <DialogDescription>
            横向对比 {compareList.length} 只股票的关键指标
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-28 font-medium">指标</TableHead>
                {compareList.map((stock) => (
                  <TableHead key={stock.thscode} className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{stock.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:text-destructive"
                          onClick={() => onRemove(stock.thscode)}
                          aria-label={`移除 ${stock.name}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge
                        variant={
                          stock.overallStatus === 'included'
                            ? 'default'
                            : stock.overallStatus === 'excluded'
                              ? 'destructive'
                              : 'outline'
                        }
                        className="h-4 text-[10px]"
                      >
                        {statusLabel[stock.overallStatus]}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {METRICS.map((metric) => (
                <TableRow key={metric.key} className="border-border hover:bg-accent/30">
                  <TableCell className="text-xs font-medium text-muted-foreground">
                    {metric.label}
                    <span className="ml-1 text-[10px]">({metric.unit})</span>
                  </TableCell>
                  {compareList.map((stock) => (
                    <TableCell
                      key={stock.thscode}
                      className={`text-center font-mono text-sm ${getValueColor(stock, metric.key)}`}
                    >
                      {getValue(stock, metric.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="border-border hover:bg-accent/30">
                <TableCell className="text-xs font-medium text-muted-foreground">
                  通过条件数
                </TableCell>
                {compareList.map((stock) => (
                  <TableCell key={stock.thscode} className="text-center font-mono text-sm">
                    <span
                      className={
                        stock.overallStatus === 'included'
                          ? 'text-success'
                          : stock.overallStatus === 'excluded'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                      }
                    >
                      {stock.includedCount}/{stock.conditionResults.length}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompareDialog;
