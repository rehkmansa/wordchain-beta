import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";

type ToastState = { id: number; message: string };

// Self-contained toast: useToast() returns a trigger + a viewport node to render once.
// Only one toast shows at a time — a new call replaces the current one.
export const useToast = () => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const viewport = (
    <div className="pointer-events-none fixed inset-x-0 top-7 z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto relative"
          >
            {/* white base layer peeking at the bottom (figma layered look) */}
            <div className="absolute inset-x-2 top-1.5 -bottom-1.5 rounded-[20px] bg-white shadow-[0_12px_30px_rgba(31,18,77,0.18)]" />
            <div className="relative grid place-items-center rounded-[20px] bg-success-600 px-7 py-3.5 font-sans font-semibold text-[15px] text-white">
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return { show, viewport };
};
