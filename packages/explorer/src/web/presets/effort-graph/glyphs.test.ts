import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { GLYPH_OUTLINES, glyphExtent, glyphSvgPoints } from './glyphs';
import { PRIMITIVES, PRIMITIVE_ORDER, primitiveOklch } from './primitives';
import { retiredOklch } from '../../core/oklch';

function polygonArea(points: ReadonlyArray<{ x: number; y: number }>): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

describe('glyph outlines', () => {
  test('every glyph carries the same visual weight as the unit circle', () => {
    // Without this, size would be a lying channel: an inscribed triangle reads
    // at ~41% of its circle, so Risks would look less important than
    // Constraints purely because of their silhouette.
    for (const [name, outline] of Object.entries(GLYPH_OUTLINES)) {
      assert.ok(
        Math.abs(polygonArea(outline) - Math.PI) < 1e-9,
        `${name} area ${polygonArea(outline)} !== circle area`
      );
    }
  });

  test('outlines are centered on the origin', () => {
    for (const [name, outline] of Object.entries(GLYPH_OUTLINES)) {
      const cx = outline.reduce((sum, p) => sum + p.x, 0) / outline.length;
      const cy = outline.reduce((sum, p) => sum + p.y, 0) / outline.length;
      assert.ok(Math.abs(cx) < 1e-9, `${name} cx=${cx}`);
      assert.ok(Math.abs(cy) < 1e-9, `${name} cy=${cy}`);
    }
  });

  test('svg points fit inside the requested viewBox', () => {
    for (const glyph of Object.keys(GLYPH_OUTLINES) as Array<
      keyof typeof GLYPH_OUTLINES
    >) {
      const points = glyphSvgPoints(glyph, 16);
      assert.ok(points, `${glyph} should produce points`);
      for (const pair of points!.split(' ')) {
        const [x, y] = pair.split(',').map(Number);
        assert.ok(x >= -0.01 && x <= 16.01, `${glyph} x=${x} out of box`);
        assert.ok(y >= -0.01 && y <= 16.01, `${glyph} y=${y} out of box`);
      }
    }
  });

  test('round glyphs have no polygon points', () => {
    assert.equal(glyphSvgPoints('circle', 16), null);
    assert.equal(glyphSvgPoints('ring', 16), null);
    assert.equal(glyphExtent('circle'), 1);
    assert.equal(glyphExtent('ring'), 1);
  });
});

describe('primitive encoding', () => {
  test('every primitive has a distinct silhouette', () => {
    const glyphs = PRIMITIVE_ORDER.map((kind) => PRIMITIVES[kind].glyph);
    assert.equal(new Set(glyphs).size, glyphs.length);
  });

  test('record hues are far enough apart to read as different primitives', () => {
    // Hue is the primary channel for primitive identity, so adjacent record
    // hues must not collapse. Shape is the backstop, not the carrier.
    const hues = PRIMITIVE_ORDER.filter((kind) => kind !== 'effort')
      .map((kind) => PRIMITIVES[kind].tone!.h)
      .sort((a, b) => a - b);
    for (let i = 1; i < hues.length; i++) {
      assert.ok(
        hues[i] - hues[i - 1] >= 40,
        `hues ${hues[i - 1]} and ${hues[i]} too close`
      );
    }
  });

  test('records share one lightness so hue alone separates them', () => {
    for (const mode of ['light', 'dark'] as const) {
      const lightness = new Set(
        PRIMITIVE_ORDER.filter((kind) => kind !== 'effort').map(
          (kind) => primitiveOklch(kind, mode).l
        )
      );
      assert.equal(
        lightness.size,
        1,
        `${mode} mode should use one record lightness`
      );
    }
  });

  test('record chroma stays level so none reads as less important', () => {
    // Unequal chroma at equal lightness creates a salience ranking. The
    // datamodel does not rank its primitives, so neither should the render.
    const chroma = PRIMITIVE_ORDER.filter((kind) => kind !== 'effort').map(
      (kind) => PRIMITIVES[kind].tone!.c
    );
    assert.ok(
      Math.max(...chroma) - Math.min(...chroma) <= 0.03,
      `chroma spread ${Math.max(...chroma) - Math.min(...chroma)} is too wide`
    );
  });

  test('retired stays clear of the background in both modes', () => {
    // Retired records must read as dead without vanishing. Light mode is the
    // tight one: white leaves far less headroom above a record's lightness
    // than black leaves below it.
    for (const mode of ['light', 'dark'] as const) {
      for (const kind of PRIMITIVE_ORDER) {
        const base = primitiveOklch(kind, mode);
        const retired = retiredOklch(base, mode);
        const distance = Math.abs(retired.l - (mode === 'light' ? 1 : 0.13));
        assert.ok(
          distance > 0.22,
          `${kind} retired lightness ${retired.l.toFixed(
            2
          )} too close to ${mode} background`
        );
        assert.ok(retired.c < base.c, `${kind} retired should lose chroma`);
      }
    }
  });
});
