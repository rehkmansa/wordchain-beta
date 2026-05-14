import { previews } from "~/ui/_preview";

export const Page = () => {
  return (
    <div className="min-h-screen bg-white text-grey-800">
      <header className="border-b border-grey-300 px-8 py-6">
        <h1 className="font-medium text-2xl">UI preview</h1>
        <p className="text-grey-400 text-sm">
          {previews.length} component{previews.length === 1 ? "" : "s"}
        </p>
      </header>
      <main className="flex flex-col">
        {previews.map(({ id, name, render }) => (
          <section key={id} id={id} className="border-b border-grey-300 px-8 py-12">
            <div className="mb-6">
              <h2 className="font-medium text-lg">{name}</h2>
              <p className="font-mono text-grey-400 text-xs">{id}</p>
            </div>
            <div className="flex min-h-50 items-center justify-center rounded-lg bg-grey-300/10 p-8">
              {render()}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};
