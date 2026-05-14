import { useNavigate } from "@tanstack/react-router";
import { StartScreenHeader } from "~/ui/start-screens/header";

export const Page = () => {
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
        className="rounded-full border border-grey-300 px-8 py-3 hover:bg-grey-300/10"
      >
        create room
      </button>
    </div>
  );
};
