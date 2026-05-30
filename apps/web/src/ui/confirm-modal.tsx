import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Button } from "./button";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onCancel}
          className="absolute inset-0 bg-grey-800/55 backdrop-blur-[2px] cursor-hand"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ scale: 0.92, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-full max-w-90 rounded-3xl bg-white p-7 text-center shadow-[0_24px_60px_rgba(31,18,77,0.3)]"
        >
          <h2 className="font-sans font-semibold text-grey-800 text-[22px] tracking-[-0.02em]">
            {title}
          </h2>
          {body && (
            <p className="mt-2 font-sans text-grey-400 text-[15px] leading-relaxed">{body}</p>
          )}
          <div className="mt-7 flex flex-col gap-3">
            <Button
              onClick={onConfirm}
              className={cn(
                destructive && "from-danger-500 to-danger-600 bg-linear-to-b hover:brightness-110",
              )}
            >
              {confirmLabel}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
