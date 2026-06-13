import { useCallback, useEffect, useRef, useState } from 'react';

export interface SimLoop {
  running: boolean;
  speed: number;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  step: () => void;
  reset: () => void;
  setSpeed: (n: number) => void;
}

export interface SimLoopOptions {
  /** Logical ticks per second at speed = 1. */
  ticksPerSecond?: number;
  /** Called once per logical tick: (dt seconds, total sim seconds). */
  onTick: (dt: number, simTime: number) => void;
  /** Called when reset() is invoked. */
  onReset?: () => void;
}

export function useSimulationLoop({
  ticksPerSecond = 4,
  onTick,
  onReset,
}: SimLoopOptions): SimLoop {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const accRef = useRef(0);
  const simTimeRef = useRef(0);
  const onTickRef = useRef(onTick);
  const speedRef = useRef(speed);
  onTickRef.current = onTick;
  speedRef.current = speed;

  const doTick = useCallback(() => {
    const dt = 1 / ticksPerSecond;
    simTimeRef.current += dt;
    onTickRef.current(dt, simTimeRef.current);
  }, [ticksPerSecond]);

  useEffect(() => {
    if (!running) return;
    const frame = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      const elapsed = (now - lastRef.current) / 1000;
      lastRef.current = now;
      accRef.current += elapsed * speedRef.current;
      const interval = 1 / ticksPerSecond;
      while (accRef.current >= interval) {
        accRef.current -= interval;
        doTick();
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [running, ticksPerSecond, doTick]);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => setRunning((r) => !r), []);
  const step = useCallback(() => doTick(), [doTick]);
  const reset = useCallback(() => {
    setRunning(false);
    accRef.current = 0;
    simTimeRef.current = 0;
    lastRef.current = null;
    onReset?.();
  }, [onReset]);

  return { running, speed, start, stop, toggle, step, reset, setSpeed };
}
