import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { selectYou, useMockGame } from "~/lib/mock/use-mock-game";
import { cn } from "~/lib/utils";
import { AvatarStack } from "~/ui/avatar";
import { ConfirmModal } from "~/ui/confirm-modal";
import { BackIcon, CopyIcon, PeopleIcon, ShareIcon, ShuffleIcon } from "~/ui/icons";
import { RoomCode } from "~/ui/room-code";
import { useToast } from "~/ui/toast";

const RANDOM_NAMES = ["WordWizard", "ChainBreaker", "QuickQuill", "VowelViper", "LexiconLion"];

export const Page = () => {
  const { roomId } = useParams({ from: "/game/$roomId/lobby" });
  const navigate = useNavigate();
  const { state, actions } = useMockGame();
  const { show, viewport } = useToast();

  const you = selectYou(state);
  const isHost = you.isHost;
  const playerCount = state.room.players.length;
  const canStart = playerCount >= 2;

  const [name, setName] = useState(you.nickname);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // host start (or bypass start) flips status → navigate everyone into Play
  useEffect(() => {
    if (state.status === "playing") {
      navigate({ to: "/game/$roomId/play", params: { roomId } });
    }
  }, [state.status, navigate, roomId]);

  const writeClipboard = (text: string) => {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      // clipboard can throw (unfocused doc / no permission) — never block the toast
    }
  };
  const copyCode = () => {
    writeClipboard(state.room.roomCode);
    show("Code copied to clipboard");
  };
  const shareLink = () => {
    writeClipboard(`${window.location.origin}/join?code=${state.room.roomCode}`);
    show("Invite link copied");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-linear-to-b from-brand-purple-500 to-brand-purple-700 text-white">
      {viewport}

      <header className="flex items-center justify-between px-6 py-5">
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-1.5 font-sans font-semibold text-white/90 outline-none cursor-hand hover:bg-white/10"
        >
          <BackIcon size={22} variant="Linear" />
          {isHost ? "Back" : "Leave"}
        </button>
        <h1 className="-translate-x-1/2 absolute left-1/2 font-sans font-semibold text-[18px] text-white tracking-[-0.01em]">
          {isHost ? "Waiting for players" : "Waiting for host"}
        </h1>
        <span className="w-16" />
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-10">
        <div className="flex w-full max-w-md flex-col items-center gap-8 pt-4">
          {/* presence */}
          <div className="flex flex-col items-center gap-3">
            <span className="flex items-center gap-2 font-sans font-semibold text-[17px]">
              <PeopleIcon size={20} variant="Bold" />
              {playerCount} joined
            </span>
            <AvatarStack players={state.room.players} max={6} />
          </div>

          {/* display name */}
          <div className="flex w-full flex-col gap-2.5">
            <span className="text-center font-sans text-[14px] text-white/70">
              Your display name
            </span>
            <div className="flex flex-col items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Display name"
                className="h-14 w-full rounded-2xl border-2 border-white/40 bg-white/10 px-5 text-center font-sans font-semibold text-[18px] text-white tracking-[-0.01em] outline-none transition-colors placeholder:text-white/40 focus:border-white/70 focus:bg-white/15"
              />
              <button
                type="button"
                onClick={() =>
                  setName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] ?? "Player")
                }
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans font-semibold text-[14px] text-white/80 outline-none cursor-hand hover:bg-white/10"
              >
                <ShuffleIcon size={16} variant="Linear" /> Randomize
              </button>
            </div>
          </div>

          {/* room code */}
          <div className="flex w-full flex-col gap-3">
            <span className="text-center font-sans text-[14px] text-white/70">
              {isHost ? "Share code to invite friends" : "Room code"}
            </span>
            <RoomCode code={state.room.roomCode} variant="panel" />
            {isHost && (
              <div className="flex gap-3">
                <PillButton icon={<CopyIcon size={18} variant="Linear" />} onClick={copyCode}>
                  Copy code
                </PillButton>
                <PillButton icon={<ShareIcon size={18} variant="Linear" />} onClick={shareLink}>
                  Share link
                </PillButton>
              </div>
            )}
          </div>

          {/* action */}
          <div className="w-full pt-2">
            {isHost ? (
              <button
                type="button"
                onClick={actions.startGame}
                disabled={!canStart}
                className="h-16 w-full rounded-2xl bg-white font-sans font-semibold text-[18px] text-brand-purple-600 tracking-[-0.01em] shadow-[0_10px_28px_rgba(31,18,77,0.25)] outline-none cursor-hand transition-[transform,filter] duration-150 hover:enabled:brightness-95 active:enabled:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {canStart ? `Start Game (${playerCount})` : "Start Game · need 2+"}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-white/25 bg-white/8 py-5">
                <span className="font-sans font-semibold text-[16px] text-white/90">
                  Waiting for host to start
                  <AnimatedDots />
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmModal
        open={leaveOpen}
        title={isHost ? "Disband this game?" : "Leave this game?"}
        body={
          isHost
            ? "Leaving will disband the room and end the session for everyone."
            : "You'll leave this room and return to the home screen."
        }
        confirmLabel={isHost ? "Disband game" : "Leave game"}
        cancelLabel="No, stay here"
        destructive
        onConfirm={() => navigate({ to: "/" })}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
};

const PillButton = ({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/40 bg-white/10 font-sans font-semibold text-[15px] text-white outline-none cursor-hand",
      "transition-colors hover:bg-white/20 active:scale-[0.985]",
    )}
  >
    {icon}
    {children}
  </button>
);

const AnimatedDots = () => (
  <span className="ml-0.5 inline-flex">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }}
      >
        .
      </span>
    ))}
  </span>
);
