import type { FieldDescriptor, FieldKind, FieldValue } from './schema.ts';
import { parseExpression } from '../units/expr.ts';
import { displayNumber } from '../units/precision.ts';
import { formatAngle, formatLength, formatPercent } from '../units/format.ts';
import { formatColor, parseColor } from '../model/style.ts';
import { clamp, degToRad } from '../util/math.ts';

/** Reads what the user typed into a field. Returns null when it cannot. */
export function parseFieldInput(
  kind: FieldKind,
  text: string
): FieldValue | null {
  switch (kind) {
    case 'length':
    case 'number':
      return parseExpression(text);
    case 'angle': {
      const degrees = parseExpression(text.replace(/°\s*$/, ''));
      return degrees === null ? null : degToRad(degrees);
    }
    case 'percent': {
      const percent = parseExpression(text.replace(/%\s*$/, ''));
      return percent === null ? null : percent / 100;
    }
    case 'color':
      return parseColor(text);
    case 'text':
      return text;
  }
}

export function formatFieldValue(kind: FieldKind, value: FieldValue): string {
  switch (kind) {
    case 'length':
      return formatLength(value as number);
    case 'number':
      return displayNumber(value as number);
    case 'angle':
      return formatAngle(value as number);
    case 'percent':
      return formatPercent(value as number);
    case 'color':
      return formatColor(value as string);
    case 'text':
      return String(value);
  }
}

/** Applies the field's bounds, if it has any. */
export function clampField(
  field: FieldDescriptor,
  value: FieldValue
): FieldValue {
  if (typeof value !== 'number') return value;
  return clamp(value, field.min ?? -Infinity, field.max ?? Infinity);
}
