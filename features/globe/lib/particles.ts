/** One particle's position along its arc, 0 (origin) → 1 (EU anchor). */
export type Particle = { t: number };

/** Advance every particle in place; wrap `t` back into [0, 1). */
export function stepParticles(
  state: Map<string, Particle[]>,
  dt: number,
  speed: number,
): void {
  const step = dt * speed;
  for (const particles of state.values()) {
    for (const p of particles) {
      p.t = (p.t + step) % 1;
      if (p.t < 0) p.t += 1;
    }
  }
}

/** `count` phases spread evenly — the still frame under reduced-motion. */
export function spacedPhases(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({ t: i / count }));
}

/** `count` phases at random offsets — the initial spread when animating. */
export function randomPhases(count: number): Particle[] {
  return Array.from({ length: count }, () => ({ t: Math.random() }));
}
