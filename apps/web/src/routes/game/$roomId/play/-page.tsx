import { useParams } from "@tanstack/react-router";

export const Page = () => {
  const { roomId } = useParams({ from: "/game/$roomId/play" });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-12">
      <h1 className="mb-6 text-5xl">Playing</h1>
      <p className="text-grey-400">Room: {roomId}</p>
    </div>
  );
};
