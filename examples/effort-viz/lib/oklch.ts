import type { GraphNodeKind } from './types';

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export type ColorMode = 'light' | 'dark';

export interface OklchColor {
  oklch: Oklch;
  css: string;
  hex: string;
  three: number;
}

const KIND_LIGHTNESS_OFFSET: Record<GraphNodeKind, number> = {
  effort: 0.06,
  issue: 0,
  finding: -0.02,
  decision: 0.03,
  constraint: -0.04,
  risk: -0.01,
};

function hashId(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unit(input: string): number {
  return (hashId(input) % 10_000) / 10_000;
}

export function effortOklch(id: string, mode: ColorMode = 'light'): Oklch {
  const hue = unit(`${id}:h`) * 360;
  const chroma = 0.18 + unit(`${id}:c`) * 0.04;
  const lightness =
    mode === 'light'
      ? 0.62 + unit(`${id}:l`) * 0.1
      : 0.58 + unit(`${id}:l`) * 0.08;

  return { l: lightness, c: chroma, h: hue };
}

export function nodeOklch(
  effortId: string,
  kind: GraphNodeKind,
  mode: ColorMode = 'light'
): Oklch {
  const base = effortOklch(effortId, mode);
  const offset = KIND_LIGHTNESS_OFFSET[kind] ?? 0;
  const adjusted =
    mode === 'light'
      ? base.l + offset
      : base.l - offset * 0.45;

  return {
    ...base,
    l: clamp(adjusted, 0.35, 0.85),
  };
}

export function oklchCss({ l, c, h }: Oklch): string {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

function linearToSrgb(channel: number): number {
  const value = clamp(channel, 0, 1);
  return value <= 0.0031308
    ? 12.92 * value
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

export function oklchToSrgb({ l, c, h }: Oklch): [number, number, number] {
  const hueRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRad);
  const b = c * Math.sin(hueRad);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lLinear = lPrime ** 3;
  const mLinear = mPrime ** 3;
  const sLinear = sPrime ** 3;

  const r =
    4.0767416621 * lLinear -
    3.3077115913 * mLinear +
    0.2309699292 * sLinear;
  const g =
    -1.2684380046 * lLinear +
    2.6097574011 * mLinear -
    0.3413193965 * sLinear;
  const bChannel =
    -0.0041960863 * lLinear -
    0.7034186147 * mLinear +
    1.707614701 * sLinear;

  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bChannel)];
}

export function oklchToHex(oklch: Oklch): string {
  const [r, g, b] = oklchToSrgb(oklch);
  const toByte = (channel: number) =>
    Math.round(clamp(channel, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function oklchToThreeColor(oklch: Oklch): number {
  const hex = oklchToHex(oklch).slice(1);
  return Number.parseInt(hex, 16);
}

export function effortColor(
  id: string,
  mode: ColorMode = 'light'
): OklchColor {
  const oklch = effortOklch(id, mode);
  return toColor(oklch);
}

export function nodeColor(
  effortId: string,
  kind: GraphNodeKind,
  mode: ColorMode = 'light'
): OklchColor {
  const oklch = nodeOklch(effortId, kind, mode);
  return toColor(oklch);
}

function toColor(oklch: Oklch): OklchColor {
  return {
    oklch,
    css: oklchCss(oklch),
    hex: oklchToHex(oklch),
    three: oklchToThreeColor(oklch),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
