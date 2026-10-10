import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import { X, Check } from 'lucide-react';
import { FIELD_OPTIONS, OPERATOR_OPTIONS } from '../constants';
import type { FilterCondition, ConditionField, ConditionOperator } from '@shared/api.interface';

interface ConditionEditorProps {
  condition: FilterCondition;
  onSave: (condition: FilterCondition) => void;
  onCancel: () => void;
}

const generateId = (): string => `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const ConditionEditor = ({ condition, onSave, onCancel }: ConditionEditorProps) => {
  const [field, setField] = useState<ConditionField>(condition.field);
  const [operator, setOperator] = useState<ConditionOperator>(condition.operator);
  const [value1, setValue1] = useState<string>(
    Array.isArray(condition.value) ? String(condition.value[0]) : String(condition.value),
  );
  const [value2, setValue2] = useState<string>(
    Array.isArray(condition.value) ? String(condition.value[1]) : '',
  );

  const selectedField = FIELD_OPTIONS.find((f) => f.value === field);

  const handleFieldChange = (val: string) => {
    setField(val as ConditionField);
  };

  const handleOperatorChange = (val: string) => {
    setOperator(val as ConditionOperator);
  };

  const handleSave = () => {
    if (!selectedField) return;
    const v1 = Number(value1);
    if (Number.isNaN(v1)) return;

    let finalValue: number | [number, number] = v1;
    if (operator === 'between') {
      const v2 = Number(value2);
      if (Number.isNaN(v2)) return;
      finalValue = [Math.min(v1, v2), Math.max(v1, v2)];
    }

    onSave({
      ...condition,
      id: condition.id || generateId(),
      field,
      fieldLabel: selectedField.label,
      operator,
      value: finalValue,
      unit: selectedField.unit,
      window: selectedField.window,
      dataSource: selectedField.dataSource,
      confirmed: true,
    });
  };

  const isBetween = operator === 'between';
  const canSave =
    selectedField &&
    value1 !== '' &&
    !Number.isNaN(Number(value1)) &&
    (!isBetween || (value2 !== '' && !Number.isNaN(Number(value2))));

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/50 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">字段</Label>
        <Select value={field} onValueChange={handleFieldChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="选择字段" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
                <span className="ml-1 text-xs text-muted-foreground">({opt.category})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">运算符</Label>
        <Select value={operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="选择运算符" />
          </SelectTrigger>
          <SelectContent>
            {OPERATOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                <span className="font-mono">{opt.symbol}</span>
                <span className="ml-2 text-xs text-muted-foreground">{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          阈值 {selectedField?.unit ? `（${selectedField.unit}）` : ''}
        </Label>
        {isBetween ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value1}
              onChange={(e) => setValue1(e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="下限"
            />
            <span className="text-muted-foreground">~</span>
            <Input
              type="number"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="上限"
            />
          </div>
        ) : (
          <Input
            type="number"
            value={value1}
            onChange={(e) => setValue1(e.target.value)}
            className="h-8 text-sm font-mono"
            placeholder="输入阈值"
          />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2 text-xs">
          <X className="mr-1 h-3.5 w-3.5" />
          取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!canSave}
          className="h-7 px-2 text-xs"
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          保存
        </Button>
      </div>
    </div>
  );
};

export default ConditionEditor;
export { generateId };
