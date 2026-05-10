import { createFileRoute, useNavigate } from "@tanstack/react-router";

const Lobby = () => {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-12">
      <h1 className="text-5xl mb-6">Lobby</h1>
      <p className="text-neutral-600 mb-2">Room code</p>
      <p className="text-3xl font-medium tracking-widest mb-10">{roomId}</p>
      <button
        type="button"
        onClick={() => navigate({ to: "/game/$roomId/play", params: { roomId } })}
        className="border border-neutral-300 rounded-full px-8 py-3 hover:bg-neutral-50"
      >
        start game
      </button>
    </div>
  );
};

export const Route = createFileRoute("/game/$roomId/lobby")({
  component: Lobby,
});
