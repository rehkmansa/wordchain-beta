import { createFileRoute, useNavigate } from "@tanstack/react-router";

const CreateGame = () => {
  const navigate = useNavigate();

  const handleCreate = () => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    navigate({ to: "/game/$roomId/lobby", params: { roomId } });
  };

  return (
    <div className="flex flex-col items-center justify-center px-12">
      <h1 className="text-5xl mb-6">Create Game</h1>
      <p className="text-neutral-600 mb-10">Game settings will go here.</p>
      <button
        type="button"
        onClick={handleCreate}
        className="border border-neutral-300 rounded-full px-8 py-3 hover:bg-neutral-50"
      >
        create room
      </button>
    </div>
  );
};

export const Route = createFileRoute("/_splash/game/create")({
  component: CreateGame,
});
