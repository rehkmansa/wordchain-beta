import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StartScreenHeader } from "~/ui/start-screens/header/header";

const CreateGame = () => {
  const navigate = useNavigate();

  const handleCreate = () => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    navigate({ to: "/game/$roomId/lobby", params: { roomId } });
  };

  return (
    <div className="flex flex-col items-center px-12">
      <div className="mb-10">
        <StartScreenHeader title="Create Game" desc="Game settings will go here." />
      </div>
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
