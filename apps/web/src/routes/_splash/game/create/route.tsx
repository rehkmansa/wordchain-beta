import { createFileRoute } from "@tanstack/react-router";
import { Page } from "./-page";

export const Route = createFileRoute("/_splash/game/create")({
  component: Page,
});
