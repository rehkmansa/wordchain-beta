import { useEffect, useState } from "react";

// Ticking server-aligned clock for countdowns. Returns Date.now() + offset,
// refreshed ~`fps` times/sec while `active`. rAF-based so it pauses with the tab.
export const useNow = (active = true, offset = 0, fps = 12) => {
  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;
    const tick = (t: number) => {
      if (t - last >= interval) {
        last = t;
        setNow(Date.now() + offset);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, fps, offset]);

  return now;
};
