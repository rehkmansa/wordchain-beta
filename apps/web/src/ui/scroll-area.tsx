import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "~/lib/utils";

type Tone = "purple" | "white";

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  tone?: Tone;
};

type Thumb = { height: number; top: number; visible: boolean };

// Fully custom, JS-driven scrollbar. The native bar is hidden; we render a chunky
// rounded "candy" thumb flush to the right edge (no parent-padding offset), with
// drag-to-scroll. One bar only — the consumer is the single scroll container.
export const ScrollArea = ({ children, className, tone = "purple" }: ScrollAreaProps) => {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb>({ height: 0, top: 0, visible: false });
  const drag = useRef<{ startY: number; startScroll: number; range: number } | null>(null);

  // change-guarded so re-render only happens when the thumb actually moves
  const measure = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setThumb((prev) => {
      if (scrollHeight <= clientHeight + 1) {
        return prev.visible ? { height: 0, top: 0, visible: false } : prev;
      }
      const height = Math.max(32, (clientHeight / scrollHeight) * clientHeight);
      const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height);
      if (prev.visible && Math.abs(prev.height - height) < 0.5 && Math.abs(prev.top - top) < 0.5) {
        return prev;
      }
      return { height, top, visible: true };
    });
  }, []);

  useEffect(() => {
    const el = viewport.current;
    const inner = content.current;
    if (!el || !inner) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [measure]);

  const onThumbDown = (e: ReactPointerEvent) => {
    const el = viewport.current;
    if (!el) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      startY: e.clientY,
      startScroll: el.scrollTop,
      range: el.clientHeight - thumb.height,
    };
  };

  const onThumbMove = (e: ReactPointerEvent) => {
    const el = viewport.current;
    const d = drag.current;
    if (!el || !d || d.range <= 0) return;
    const delta = e.clientY - d.startY;
    const scrollable = el.scrollHeight - el.clientHeight;
    el.scrollTop = d.startScroll + (delta / d.range) * scrollable;
  };

  const onThumbUp = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={viewport}
        onScroll={measure}
        className="h-full w-full overflow-y-auto pr-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={content}>{children}</div>
      </div>
      {thumb.visible && (
        <div className="pointer-events-none absolute inset-y-1 right-0 w-2.5">
          <button
            type="button"
            aria-label="Scroll"
            onPointerDown={onThumbDown}
            onPointerMove={onThumbMove}
            onPointerUp={onThumbUp}
            style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
            className={cn(
              "pointer-events-auto absolute inset-x-0 cursor-hand rounded-full outline-none transition-[filter] duration-150 hover:brightness-110",
              tone === "purple"
                ? "bg-linear-to-b from-brand-purple-400 to-brand-purple-600 shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_2px_6px_rgba(111,83,253,0.4)]"
                : "bg-linear-to-b from-white/85 to-white/55 shadow-[inset_0_2px_0_rgba(255,255,255,0.7)]",
            )}
          />
        </div>
      )}
    </div>
  );
};
