import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "./-layout";

export const Route = createFileRoute("/game/$roomId")({
  component: GameLayout,
});
