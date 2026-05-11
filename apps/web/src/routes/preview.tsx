import { createFileRoute, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Preview = {
  name: string;
  render: () => ReactNode;
};

const modules = import.meta.glob<{ default: Preview }>("../ui/**/preview.tsx", { eager: true });

const previews: Array<{ id: string; preview: Preview }> = Object.entries(modules)
  .map(([path, mod]) => ({
    id: path.replace("../ui/", "").replace(/\/preview\.tsx$/, ""),
    preview: mod.default,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

const PreviewPage = () => {
  if (!import.meta.env.DEV) throw notFound();

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="px-8 py-6 border-b border-neutral-200">
        <h1 className="text-2xl font-medium">UI preview</h1>
        <p className="text-sm text-neutral-500">
          {previews.length} component{previews.length === 1 ? "" : "s"}
        </p>
      </header>
      <main className="flex flex-col">
        {previews.map(({ id, preview }) => (
          <section key={id} id={id} className="px-8 py-12 border-b border-neutral-200">
            <div className="mb-6">
              <h2 className="text-lg font-medium">{preview.name}</h2>
              <p className="text-xs text-neutral-400 font-mono">{id}</p>
            </div>
            <div className="flex items-center justify-center min-h-50 rounded-lg bg-neutral-50 p-8">
              {preview.render()}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export const Route = createFileRoute("/preview")({
  component: PreviewPage,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
});
