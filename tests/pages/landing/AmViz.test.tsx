import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmViz } from '@/pages/landing/viz/AmViz';
import { FmViz } from '@/pages/landing/viz/FmViz';
import { VIZ } from '@/pages/landing/viz/palette';

type Point = { x: number; y: number };
type Stroke = { style: string; points: Point[] };

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;
const originalMatchMedia = window.matchMedia;
const originalResizeObserver = window.ResizeObserver;

function installCanvasMock() {
  const strokes: Stroke[] = [];
  let activePoints: Point[] = [];

  const ctx = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    globalAlpha: 1,
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(() => {
      activePoints = [];
    }),
    moveTo: vi.fn((x: number, y: number) => {
      activePoints.push({ x, y });
    }),
    lineTo: vi.fn((x: number, y: number) => {
      activePoints.push({ x, y });
    }),
    stroke: vi.fn(() => {
      strokes.push({ style: String(ctx.strokeStyle), points: [...activePoints] });
    }),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 480,
    height: 180,
    top: 0,
    left: 0,
    right: 480,
    bottom: 180,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);

  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  };

  return { strokes };
}

afterEach(() => {
  vi.restoreAllMocks();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  window.matchMedia = originalMatchMedia;
  window.ResizeObserver = originalResizeObserver;
});

describe('AmViz', () => {
  it('draws a true AM carrier inside separate upper and lower envelope rails', () => {
    const { strokes } = installCanvasMock();

    render(<AmViz />);

    const midline = 90;
    const envelopeStrokes = strokes.filter((stroke) => stroke.style === VIZ.orange);

    expect(envelopeStrokes).toHaveLength(2);
    expect(envelopeStrokes[0].points.every((point) => point.y < midline)).toBe(true);
    expect(envelopeStrokes[1].points.every((point) => point.y > midline)).toBe(true);
  });
});

describe('FmViz', () => {
  it('draws flat (constant-envelope) rails — FM amplitude does not bulge', () => {
    const { strokes } = installCanvasMock();

    render(<FmViz />);

    const midline = 90;
    const envelopeStrokes = strokes.filter((stroke) => stroke.style === VIZ.orange);

    expect(envelopeStrokes).toHaveLength(2);
    // Constant envelope: every point on each rail shares the same y (flat line).
    for (const rail of envelopeStrokes) {
      const firstY = rail.points[0].y;
      expect(rail.points.every((point) => point.y === firstY)).toBe(true);
    }
    expect(envelopeStrokes[0].points.every((point) => point.y < midline)).toBe(true);
    expect(envelopeStrokes[1].points.every((point) => point.y > midline)).toBe(true);
  });
});
