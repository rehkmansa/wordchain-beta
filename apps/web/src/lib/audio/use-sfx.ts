import { useSyncExternalStore } from "react";
import { isMuted, setMuted, subscribeMuted } from "./sfx";

export const useMuted = (): { muted: boolean; toggle: () => void } => {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, isMuted);
  return { muted, toggle: () => setMuted(!muted) };
};
