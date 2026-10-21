import type { Point } from '../model/geometry.ts';
import type { ViewState } from '../persist/viewstate.ts';
import { MAX_ZOOM, MIN_ZOOM } from '../persist/viewstate.ts';
import { clamp } from '../util/math.ts';

export const ZOOM_STEPS = [0.25, 0.5, 1, 2, 4, 8];

/** Screen to document coordinates. Zoom lives in the view state; pan does not persist. */
export class Viewport {
  pan: Point = { x: 0, y: 0 };
  private state: () => ViewState;

  constructor(state: () => ViewState) {
    this.state = state;
  }

  get zoom(): number {
    return this.state().zoom;
  }

  setZoom(zoom: number, about: Point = { x: 0, y: 0 }): void {
    const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const before = this.toDocument(about);
    this.state().zoom = next;
    const after = this.toDocument(about);
    this.pan = {
      x: this.pan.x + (after.x - before.x) * next,
      y: this.pan.y + (after.y - before.y) * next,
    };
  }

  zoomIn(): void {
    this.setZoom(ZOOM_STEPS.find((z) => z > this.zoom) ?? this.zoom * 2);
  }

  zoomOut(): void {
    this.setZoom(
      [...ZOOM_STEPS].reverse().find((z) => z < this.zoom) ?? this.zoom / 2
    );
  }

  toDocument(screen: Point): Point {
    return {
      x: (screen.x - this.pan.x) / this.zoom,
      y: (screen.y - this.pan.y) / this.zoom,
    };
  }

  toScreen(point: Point): Point {
    return {
      x: point.x * this.zoom + this.pan.x,
      y: point.y * this.zoom + this.pan.y,
    };
  }
}
