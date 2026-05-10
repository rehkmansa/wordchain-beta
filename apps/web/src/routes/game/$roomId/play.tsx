import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/game/$roomId/play")({
  component: Play,
});

function Play() {
  const { roomId } = Route.useParams();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-12">
      <h1 className="text-5xl mb-6">Playing</h1>
      <p className="text-neutral-600">Room: {roomId}</p>
    </div>
  );
}
