import { useNavigate } from "@tanstack/react-router";
import { StartScreenHeader } from "~/ui/start-screens/header";
import { StartButton } from "./-components/start-button";

export const Page = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center px-12 pt-25">
      <div className="mb-10 max-w-100">
        <StartScreenHeader
          title="Word Chains"
          desc="Race the clock to complete the compound word. Fastest minds win."
        />
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <StartButton accent="purple" onClick={() => navigate({ to: "/game/create" })}>
          Create Room
        </StartButton>
        <StartButton accent="gold" onClick={() => navigate({ to: "/game/join" })}>
          Join Room
        </StartButton>
      </div>
    </div>
  );
};
