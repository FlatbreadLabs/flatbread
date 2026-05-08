import type { IdentifierField } from '../types';

export type NormalizedIdentifier = string;

export const isIdentifierField = (value: unknown): value is IdentifierField =>
  typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value));

export const normalizeIdentifier = (
  value: unknown
): NormalizedIdentifier | undefined => {
  if (!isIdentifierField(value)) return undefined;
  return String(value);
};

export const normalizeIdentifiers = (
  values: unknown
): NormalizedIdentifier[] => {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => normalizeIdentifier(value))
    .filter((value): value is NormalizedIdentifier => value !== undefined);
};

export const identifiersEqual = (left: unknown, right: unknown): boolean => {
  const normalizedLeft = normalizeIdentifier(left);
  const normalizedRight = normalizeIdentifier(right);

  if (normalizedLeft === undefined || normalizedRight === undefined) {
    return false;
  }

  return normalizedLeft === normalizedRight;
};

export const createIdentifierSet = (
  values: unknown
): Set<NormalizedIdentifier> => new Set(normalizeIdentifiers(values));
