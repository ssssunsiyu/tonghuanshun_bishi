import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@client/src/components/ui/alert';
import { parseIntent } from '@client/src/api/screen';
import { SAMPLE_QUERIES } from '../constants';
import type { FilterCondition, AiParseResult } from '@shared/api.interface';

interface NlInputPanelProps {
  onConditionsParsed: (conditions: FilterCondition[], parseResult: AiParseResult) => void;
}

const NlInputPanel = ({ onConditionsParsed }: NlInputPanelProps) => {
  const [query, setQuery] = useState('');

  const parseMutation = useMutation({
    mutationFn: (q: string) => parseIntent(q),
    onSuccess: (data) => {
      logger.info('意图解析成功', data.conditions.length, '个条件');
      onConditionsParsed(data.conditions, data);
      toast.success('解析成功，已生成筛选条件');
    },
    onError: (error: Error) => {
      logger.error('意图解析失败', error);
      toast.error(`解析失败：${error.message || '请稍后重试'}`);
    },
  });

  const handleParse = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      toast.warning('请输入选股描述');
      return;
    }
    parseMutation.mutate(trimmed);
  };

  const handleSampleClick = (sample: string) => {
    setQuery(sample);
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          自然语言选股
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            placeholder="描述你想找的股票，例如：低估值、高成长、波动小的蓝筹股…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[96px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleParse();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            提示：支持 ⌘/Ctrl + Enter 快速解析
          </p>
        </div>

        <Button
          className="w-full"
          onClick={handleParse}
          disabled={parseMutation.isPending || !query.trim()}
        >
          {parseMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              解析中…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              AI 解析条件
            </>
          )}
        </Button>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            试试这些描述
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_QUERIES.map((sample) => (
              <Badge
                key={sample}
                variant="secondary"
                className="cursor-pointer text-xs font-normal hover:bg-accent"
                onClick={() => handleSampleClick(sample)}
              >
                {sample}
              </Badge>
            ))}
          </div>
        </div>

        {parseMutation.data && (
          <Alert variant="default" className="border-primary/30 bg-primary/5">
            <AlertTitle className="text-sm font-medium text-primary">AI 说明</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              <p className="mb-1.5">{parseMutation.data.clarification}</p>
              {parseMutation.data.assumptions.length > 0 && (
                <div>
                  <p className="mb-0.5 font-medium text-foreground/80">前提假设：</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {parseMutation.data.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default NlInputPanel;
