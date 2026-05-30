import { useNavigate } from "@tanstack/react-router";
import { Button } from "~/ui/button";
import { Emoji } from "~/ui/emoji";

export const JoinPending = () => (
  <div className="grid min-h-screen place-items-center bg-linear-to-b from-brand-purple-500 to-brand-purple-700 px-6 text-white">
    <div className="flex flex-col items-center gap-3 font-sans font-semibold text-[16px]">
      <Emoji name="dash" size={32} className="animate-bounce" />
      Joining room…
    </div>
  </div>
);

const ERROR_COPY: Record<string, string> = {
  ROOM_NOT_FOUND: "That room code doesn't exist anymore.",
  ROOM_LOCKED: "That game has already started.",
  ROOM_FULL: "That room is full.",
};

export const JoinError = ({ error }: { error: Error }) => {
  const navigate = useNavigate();
  const message = ERROR_COPY[error.message] ?? "We couldn't join that room.";

  return (
    <div className="grid min-h-screen place-items-center bg-linear-to-b from-brand-purple-500 to-brand-purple-800 px-6 text-white">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <Emoji name="sad" size={56} />
        <p className="font-sans font-semibold text-[18px]">{message}</p>
        <div className="flex w-full flex-col gap-2">
          <Button onClick={() => navigate({ to: "/game/join" })}>Enter a code</Button>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="font-sans text-[15px] text-white/70 outline-none cursor-hand hover:text-white"
          >
            Back home
          </button>
        </div>
      </div>
    </div>
  );
};
