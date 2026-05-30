import { useEffect, useRef } from "react";
import { subscribeFeedback } from "./bus";
import type { FeedbackEvent } from "./events";

// Subscribe a component to feedback events for visual reactions (shake, confetti,
// streak bursts). The handler ref keeps the subscription stable across renders.
export const useFeedback = (handler: (e: FeedbackEvent) => void): void => {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribeFeedback((e) => ref.current(e)), []);
};
