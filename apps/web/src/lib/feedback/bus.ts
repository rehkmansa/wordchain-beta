import type { FeedbackEvent } from "./events";

type Listener = (e: FeedbackEvent) => void;

const listeners = new Set<Listener>();

export const emitFeedback = (e: FeedbackEvent): void => {
  for (const fn of listeners) fn(e);
};

export const subscribeFeedback = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
