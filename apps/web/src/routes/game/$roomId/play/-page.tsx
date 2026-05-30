import { useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { selectLeaderboard, selectYou, useMockGame } from "~/lib/mock/use-mock-game";
import { useNow } from "~/lib/use-now";
import { ConfirmModal } from "~/ui/confirm-modal";
import { CurrentRound } from "./-components/current-round";
import { PlayerHud, StreakPill } from "./-components/player-hud";
import { ProgressDots, ProgressRail } from "./-components/progress-rail";
import { RoundInterlude } from "./-components/round-interlude";
import { SidePanel } from "./-components/side-panel";
import { TopBar } from "./-components/top-bar";

export const Page = () => {
  const { roomId } = useParams({ from: "/game/$roomId/play" });
  const navigate = useNavigate();
  const { state, actions } = useMockGame();
  const ticking = state.status === "playing" || state.status === "interlude";
  const now = useNow(ticking);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // game over → standings screen
  useEffect(() => {
    if (state.status === "over") {
      navigate({ to: "/game/$roomId/over", params: { roomId } });
    }
    if (state.status === "lobby") {
      navigate({ to: "/game/$roomId/lobby", params: { roomId } });
    }
  }, [state.status, navigate, roomId]);

  const you = selectYou(state);
  const round = state.round;
  const leaderboard = selectLeaderboard(state);
  const { settings } = state.room;
  const totalLives = settings.lives ?? 3;

  if (!round) {
    return (
      <div className="grid min-h-screen place-items-center bg-linear-to-b from-brand-purple-500 to-brand-purple-700 text-white/70">
        Loading round…
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-linear-to-b from-brand-purple-500 to-brand-purple-800 text-white">
      <TopBar
        roundNumber={round.index + 1}
        totalRounds={settings.chainLength}
        opponentCount={state.room.players.length - 1}
        score={you.score}
        onBack={() => setLeaveOpen(true)}
      />

      {!state.connected && (
        <div className="bg-danger-500/90 py-1.5 text-center font-sans font-semibold text-[13px] text-white">
          Reconnecting… your inputs are paused
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 px-4 pb-4 lg:grid-cols-[360px_1fr]">
        {/* desktop sidebar */}
        <aside className="hidden min-h-0 flex-col gap-3 lg:flex">
          <div className="flex max-h-72 flex-col rounded-2xl bg-white/8 p-3">
            <span className="px-1 pb-2 font-sans text-[12px] font-semibold uppercase tracking-wide text-white/40">
              Progress
            </span>
            <ProgressRail
              total={settings.chainLength}
              currentIndex={round.index}
              history={state.history}
            />
          </div>
          <PlayerHud
            multiplier={you.multiplier}
            streak={you.streak}
            livesLeft={you.livesLeft}
            totalLives={totalLives}
          />
          <SidePanel
            className="min-h-0 flex-1"
            feed={state.feed}
            players={leaderboard}
            youId={you.id}
            elimination={settings.elimination}
          />
        </aside>

        {/* focal main */}
        <main className="fancy-scroll-dark flex min-h-0 flex-col items-center gap-4 overflow-y-auto pt-2">
          {/* mobile top strip */}
          <div className="flex w-full items-center justify-between gap-3 lg:hidden">
            <ProgressDots
              total={settings.chainLength}
              currentIndex={round.index}
              history={state.history}
            />
            <StreakPill multiplier={you.multiplier} streak={you.streak} />
          </div>

          <div className="flex w-full flex-1 items-center justify-center">
            <CurrentRound
              roundNumber={round.index + 1}
              start={round.start}
              phase={round.phase}
              now={now}
              typed={round.you.typed}
              onType={actions.typeGuess}
              onSubmit={actions.submitGuess}
              onHint={actions.requestHint}
              hints={round.you.hints}
              hintsUsed={round.you.hintsUsed}
              score={you.score}
              cooldownUntil={round.you.cooldownUntil}
              nearMiss={round.you.nearMiss}
              lock={round.you.lock}
              spectator={state.eliminated}
            />
          </div>
        </main>
      </div>

      {/* mobile bottom sheet for feed / leaderboard */}
      <MobileSheet
        open={sheetOpen}
        onToggle={() => setSheetOpen((o) => !o)}
        feed={state.feed}
        players={leaderboard}
        youId={you.id}
        elimination={settings.elimination}
      />

      {/* round-end interlude */}
      <AnimatePresence>
        {state.status === "interlude" && state.roundEnd && (
          <RoundInterlude roundEnd={state.roundEnd} start={round.start} youId={you.id} now={now} />
        )}
      </AnimatePresence>

      <ConfirmModal
        open={leaveOpen}
        title="Leave the game?"
        body="You'll forfeit this game and return to the home screen."
        confirmLabel="Leave game"
        cancelLabel="Keep playing"
        destructive
        onConfirm={() => navigate({ to: "/" })}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
};

const MobileSheet = ({
  open,
  onToggle,
  feed,
  players,
  youId,
  elimination,
}: {
  open: boolean;
  onToggle: () => void;
  feed: import("~/lib/mock/use-mock-game").FeedEntry[];
  players: import("@repo/shared").PublicPlayer[];
  youId: string;
  elimination: boolean;
}) => (
  <motion.div
    className="fixed inset-x-0 bottom-10 z-20 lg:hidden"
    animate={{ y: open ? 0 : "calc(100% - 56px)" }}
    transition={{ type: "spring", stiffness: 320, damping: 32 }}
  >
    <div className="mx-3 rounded-t-3xl bg-white shadow-[0_-10px_40px_rgba(31,18,77,0.25)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-14 w-full items-center justify-center gap-2 font-sans font-semibold text-[15px] text-brand-purple-600 cursor-hand"
      >
        <span className="absolute top-2 h-1 w-10 rounded-full bg-grey-300/60" />
        {open ? "Hide" : "Feed & Leaderboard"}
      </button>
      <div className="h-96 px-2 pb-3">
        <SidePanel
          className="h-full"
          feed={feed}
          players={players}
          youId={youId}
          elimination={elimination}
        />
      </div>
    </div>
  </motion.div>
);
