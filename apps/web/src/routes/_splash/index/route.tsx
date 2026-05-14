// Landing page. Lives nested under the `_splash` layout because that layout
// (header, splash animation) is shared by both this landing route and the
// `game/*` routes (e.g. `/game/create`).
import { createFileRoute } from "@tanstack/react-router";
import { Page } from "./-page";

export const Route = createFileRoute("/_splash/")({
  component: Page,
});
