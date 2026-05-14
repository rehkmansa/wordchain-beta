import { createFileRoute, notFound } from "@tanstack/react-router";
import { Page } from "./-page";

export const Route = createFileRoute("/preview")({
  component: Page,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
});
