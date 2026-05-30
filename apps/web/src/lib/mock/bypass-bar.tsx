import type { ReactNode } from "react";
import { useMockGame } from "./use-mock-game";

// Dev-only control strip that drives everything a server would. Never ships:
// the whole component returns null outside import.meta.env.DEV.
const DevButton = ({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "go" | "danger";
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={[
      "rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold whitespace-nowrap transition-colors",
      "disabled:opacity-30 disabled:cursor-not-allowed",
      tone === "go"
        ? "bg-emerald-500/90 text-white hover:bg-emerald-400"
        : tone === "danger"
          ? "bg-rose-500/90 text-white hover:bg-rose-400"
          : "bg-white/10 text-white/90 hover:bg-white/20",
    ].join(" ")}
  >
    {children}
  </button>
);

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <span className="font-mono text-[10px] uppercase tracking-wide text-white/40">{label}</span>
    {children}
  </div>
);

export const BypassBar = () => {
  const { state, actions } = useMockGame();
  const { status, room, eliminated, connected } = state;

  if (!import.meta.env.DEV) return null;

  const playerCount = room.players.length;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 bg-grey-800/95 px-4 py-2 backdrop-blur">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-500">
        ⚡ bypass · {status}
      </span>

      {status === "lobby" && (
        <>
          <Group label="presence">
            <DevButton onClick={actions.addPlayer}>+ player</DevButton>
            <DevButton onClick={actions.removePlayer} disabled={playerCount <= 1}>
              − player
            </DevButton>
            <span className="font-mono text-[11px] text-white/60">{playerCount} in room</span>
          </Group>
          <Group label="host">
            <DevButton tone="go" onClick={actions.startGame} disabled={playerCount < 2}>
              ▶ start game
            </DevButton>
          </Group>
        </>
      )}

      {(status === "playing" || status === "interlude") && (
        <>
          <Group label="opponents">
            <DevButton onClick={() => actions.simulateOpponentSolves(1)}>+1 solves</DevButton>
            <DevButton onClick={() => actions.simulateOpponentSolves(5)}>+5 solve</DevButton>
          </Group>
          <Group label="round">
            <DevButton tone="go" onClick={actions.advanceRound}>
              ⏭ advance
            </DevButton>
          </Group>
          <Group label="you">
            <DevButton tone="danger" onClick={actions.eliminateYou} disabled={eliminated}>
              💀 eliminate
            </DevButton>
            <DevButton onClick={actions.toggleConnected}>
              {connected ? "⚡ disconnect" : "⚡ reconnect"}
            </DevButton>
          </Group>
          <Group label="game">
            <DevButton tone="danger" onClick={actions.endGame}>
              ⏹ end game
            </DevButton>
          </Group>
        </>
      )}

      {status === "over" && (
        <Group label="game">
          <DevButton tone="go" onClick={actions.reset}>
            ↺ reset to lobby
          </DevButton>
        </Group>
      )}
    </div>
  );
};
