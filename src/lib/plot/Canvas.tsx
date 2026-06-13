import { useEffect, useRef } from 'react';

export interface CanvasProps {
  /** Draw callback; receives the 2D context and CSS-pixel width/height. */
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Re-run draw whenever any dependency changes. */
  deps?: unknown[];
  height?: number;
  className?: string;
  ariaLabel?: string;
}

export function Canvas({ draw, deps = [], height = 240, className, ariaLabel }: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, ...deps]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ width: '100%' }}
    />
  );
}
