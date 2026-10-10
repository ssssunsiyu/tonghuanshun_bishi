import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Separator } from '@client/src/components/ui/separator';
import { ScrollArea } from '@client/src/components/ui/scroll-area';
import { runScreen, compareScreen } from '@client/src/api/screen';
import NlInputPanel from './components/NlInputPanel';
import ConditionCardList from './components/ConditionCardList';
import ResultPanel from './components/ResultPanel';
import StockDetailDrawer from './components/StockDetailDrawer';
import CompareDialog from './components/CompareDialog';
import SaveStrategyDialog from './components/SaveStrategyDialog';
import { DEFAULT_POOL } from './constants';
import type {
  FilterCondition,
  ScreenResult,
  ScreenedStock,
  AiParseResult,
  ScreenDiff,
  Strategy,
} from '@shared/api.interface';

const StockPickerPage = () => {
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [screenResult, setScreenResult] = useState<ScreenResult | null>(null);
  const [previousConditions, setPreviousConditions] = useState<FilterCondition[] | null>(null);
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<ScreenDiff | null>(null);
  const [isScreening, setIsScreening] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<ScreenedStock | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareList, setCompareList] = useState<ScreenedStock[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [poolCode, setPoolCode] = useState(DEFAULT_POOL.code);
  const [poolName, setPoolName] = useState(DEFAULT_POOL.name);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('apply_strategy');
      if (!raw) return;
      const strategy = JSON.parse(raw) as Strategy;
      if (Array.isArray(strategy.conditions) && strategy.conditions.length > 0) {
        setConditions(strategy.conditions);
        if (strategy.poolCode) setPoolCode(strategy.poolCode);
        if (strategy.poolName) setPoolName(strategy.poolName);
        toast.success(`已应用策略「${strategy.name}」`);
      }
    } catch (err) {
      logger.error('读取应用策略失败', err);
    } finally {
      sessionStorage.removeItem('apply_strategy');
    }
  }, []);

  const handleConditionsParsed = useCallback(
    (newConditions: FilterCondition[], parseResult: AiParseResult) => {
      setConditions(newConditions);
      setPoolCode(parseResult.pool.code);
      setPoolName(parseResult.pool.name);
    },
    [],
  );

  const screenMutation = useMutation({
    mutationFn: async (conds: FilterCondition[]) => {
      if (previousConditions && previousConditions.length > 0 && lastSnapshotId) {
        return compareScreen(previousConditions, conds, poolCode, lastSnapshotId);
      }
      return runScreen(conds, poolCode);
    },
    onMutate: () => {
      setIsScreening(true);
    },
    onSuccess: (data) => {
      const isDiff = 'added' in data && 'currentResult' in data;
       if (isDiff) {
        const diffData = data as ScreenDiff;
        logger.info('差异筛选完成', diffData.added.length, '新增', diffData.removed.length, '移除');
        setDiffResult(diffData);
        setScreenResult(diffData.currentResult);
        setLastSnapshotId(diffData.snapshotId);
        toast.success(
          `筛选完成：新增 ${diffData.added.length} 只，移除 ${diffData.removed.length} 只，未变 ${diffData.unchanged.length} 只`,
        );
      } else {
        const result = data as ScreenResult;
        logger.info('筛选完成', result.included, '只入选');
        setDiffResult(null);
        setScreenResult(result);
        setLastSnapshotId(result.snapshotId);
        toast.success(`筛选完成：${result.included} 只股票入选`);
      }
      setScreenError(null);
      setPreviousConditions([...conditions]);
      setCompareList([]);
    },
    onError: (error: Error) => {
      logger.error('筛选失败', error);
      setScreenResult(null);
      const msg = error.message || '请稍后重试';
      setScreenError(msg);
      toast.error(`筛选失败：${msg}`);
    },
    onSettled: () => {
      setIsScreening(false);
    },
  });

  const handleRunScreen = useCallback(() => {
    screenMutation.mutate(conditions);
  }, [conditions, screenMutation]);

  const handleSelectStock = useCallback((stock: ScreenedStock) => {
    setSelectedStock(stock);
    setDrawerOpen(true);
  }, []);

  const handleToggleCompare = useCallback((stock: ScreenedStock) => {
    setCompareList((prev) => {
      const exists = prev.some((s) => s.thscode === stock.thscode);
      if (exists) {
        return prev.filter((s) => s.thscode !== stock.thscode);
      }
      if (prev.length >= 5) {
        toast.warning('最多选择 5 只股票对比');
        return prev;
      }
      return [...prev, stock];
    });
  }, []);

  const handleRemoveFromCompare = useCallback((thscode: string) => {
    setCompareList((prev) => prev.filter((s) => s.thscode !== thscode));
  }, []);

  const handleOpenCompare = useCallback(() => {
    if (compareList.length < 2) {
      toast.warning('请至少选择 2 只股票对比');
      return;
    }
    setShowCompare(true);
  }, [compareList.length]);

  return (
    <div className="flex h-full w-full">
      {/* 左侧：条件面板 */}
      <div className="flex w-96 shrink-0 flex-col gap-3 border-r border-border bg-sidebar/30 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">智能选股</h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={conditions.length === 0}
          >
            <Save className="mr-1.5 h-4 w-4" />
            保存策略
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3 pb-4">
            <NlInputPanel onConditionsParsed={handleConditionsParsed} />
            <ConditionCardList
              conditions={conditions}
              onConditionsChange={setConditions}
              onRunScreen={handleRunScreen}
              isScreening={isScreening}
            />
          </div>
        </ScrollArea>
        {previousConditions && (
          <div className="pt-2 text-[11px] text-muted-foreground">
            上次筛选条件：{previousConditions.length} 条
          </div>
        )}
      </div>

      {/* 右侧：结果面板 */}
      <div className="flex flex-1 flex-col p-4">
        <ResultPanel
          result={screenResult}
          diff={diffResult}
          isLoading={isScreening}
          error={screenError}
          selectedStock={selectedStock}
          onSelectStock={handleSelectStock}
          compareList={compareList}
          onToggleCompare={handleToggleCompare}
          onOpenCompare={handleOpenCompare}
        />
      </div>

      {/* 详情抽屉 */}
      <StockDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        stock={selectedStock}
      />

      {/* 对比对话框 */}
      <CompareDialog
        open={showCompare}
        onOpenChange={setShowCompare}
        compareList={compareList}
        onRemove={handleRemoveFromCompare}
      />

      {/* 保存策略对话框 */}
      <SaveStrategyDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        conditions={conditions}
        poolCode={poolCode}
        poolName={poolName}
      />
    </div>
  );
};

export default StockPickerPage;
