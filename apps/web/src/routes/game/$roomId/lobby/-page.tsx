import { useNavigate, useParams } from "@tanstack/react-router";

export const Page = () => {
  const { roomId } = useParams({ from: "/game/$roomId/lobby" });
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-12">
      <h1 className="mb-6 text-5xl">Lobby</h1>
      <p className="mb-2 text-grey-400">Room code</p>
      <p className="mb-10 font-medium text-3xl tracking-widest">{roomId}</p>
      <button
        type="button"
        onClick={() => navigate({ to: "/game/$roomId/play", params: { roomId } })}
        className="rounded-full border border-grey-300 px-8 py-3 hover:bg-grey-300/10"
      >
        start game
      </button>
    </div>
  );
};
