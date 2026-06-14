import type { useSimulationLoop } from '@/lib/sim/useSimulationLoop';

/** Props every AM section receives from the module shell. */
export interface SectionProps {
  /** Shared animation clock in seconds (drives every section's animation). */
  clock: number;
  /** Shared transport loop (start/pause/reset), rendered per section. */
  loop: ReturnType<typeof useSimulationLoop>;
}
