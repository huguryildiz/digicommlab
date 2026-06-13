import { useEffect, useRef, type RefObject } from 'react';

/**
 * Bir canvas'a CSS-piksel koordinatlarında çizim yapan fonksiyon.
 * Context, devicePixelRatio kadar ölçeklenmiştir; (w, h) CSS pikselidir.
 */
export type DrawFn = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void;

/* ─────────────────────────────────────────────────────────────────────────
 * Tek paylaşılan requestAnimationFrame döngüsü — tüm landing canvas'ları aynı
 * tick'i kullanır. Sekme gizliyken durur; görünür canvas kalmazsa durur.
 * ───────────────────────────────────────────────────────────────────────── */
const drawers = new Set<() => void>();
let frame = 0;
let rafId = 0;
let looping = false;

function tick(): void {
  frame += 1;
  drawers.forEach((d) => d());
  rafId = requestAnimationFrame(tick);
}
function ensureRunning(): void {
  if (!looping && drawers.size > 0 && typeof document !== 'undefined' && !document.hidden) {
    looping = true;
    rafId = requestAnimationFrame(tick);
  }
}
function stopLoop(): void {
  looping = false;
  if (rafId) cancelAnimationFrame(rafId);
}
function register(d: () => void): void {
  drawers.add(d);
  ensureRunning();
}
function unregister(d: () => void): void {
  drawers.delete(d);
  if (drawers.size === 0) stopLoop();
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else ensureRunning();
  });
}

function prefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Canvas ref'i döndürür; `draw` her frame çağrılır. devicePixelRatio'a göre
 * boyutlandırır (max 2), `prefers-reduced-motion` ile tek statik frame çizer,
 * ekran dışındayken ve sekme gizliyken durur.
 */
export function useCanvasTicker(draw: DrawFn): RefObject<HTMLCanvasElement> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<DrawFn>(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = (): void => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // CSS-piksel koordinat sistemi
    };
    const paint = (): void => drawRef.current(ctx, frame, w, h);

    resize();
    paint(); // ilk frame anında görünsün

    const ro = new ResizeObserver(() => {
      resize();
      paint();
    });
    ro.observe(canvas);

    // Hareket azaltma: döngüye girme, tek statik frame yeter.
    if (prefersReduced()) {
      return () => ro.disconnect();
    }

    let added = false;
    const add = (): void => {
      if (!added) {
        register(paint);
        added = true;
      }
    };
    const remove = (): void => {
      if (added) {
        unregister(paint);
        added = false;
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) add();
        else remove();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    return () => {
      io.disconnect();
      ro.disconnect();
      remove();
    };
  }, []);

  return canvasRef;
}
