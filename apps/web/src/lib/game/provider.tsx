import type { GameMode, GameSettings } from "@repo/shared";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { buildWsUrl } from "~/lib/api/ws-url";
import { deriveFeedback, emitFeedback } from "~/lib/feedback";
import { initialState, reducer } from "./reducer";
import { GameSocket } from "./socket";
import type { GameState } from "./types";

export { selectLeaderboard, selectYou } from "./types";

type GameActions = {
  startGame: () => void;
  typeGuess: (v: string) => void;
  submitGuess: () => void;
  requestHint: () => void;
  setNickname: (name: string) => void;
  leave: () => void;
};

type Ctx = { state: GameState; actions: GameActions; clockOffset: number };
const GameContext = createContext<Ctx | null>(null);

type ProviderProps = {
  children: ReactNode;
  roomCode: string;
  gameId: string;
  youId: string;
  nickname: string;
  mode: GameMode;
  settings: GameSettings;
};

export const GameProvider = ({
  children,
  roomCode,
  gameId,
  youId,
  nickname,
  mode,
  settings,
}: ProviderProps) => {
  const [state, dispatch] = useReducer(
    reducer,
    { youId, nickname, roomCode, gameId, mode, settings },
    initialState,
  );
  const [clockOffset, setClockOffset] = useState(0);

  const socketRef = useRef<GameSocket | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const socket = new GameSocket(buildWsUrl(roomCode, gameId), {
      onMessage: (msg) => {
        // stateRef still holds the pre-message state here — needed to diff streaks
        for (const e of deriveFeedback(stateRef.current, msg, youId)) emitFeedback(e);
        dispatch(msg);
      },
      onConnected: (connected) => dispatch({ type: "conn", connected }),
      onClockOffset: setClockOffset,
    });
    socketRef.current = socket;
    return () => {
      socket.dispose();
      socketRef.current = null;
    };
  }, [roomCode, gameId, youId]);

  const actions = useMemo<GameActions>(
    () => ({
      startGame: () => socketRef.current?.send({ type: "start_game" }),
      typeGuess: (value) => dispatch({ type: "typed", value }),
      submitGuess: () => {
        const round = stateRef.current.round;
        if (!round || round.you.lock) return;
        const answer = round.you.typed.trim();
        if (!answer) return;
        socketRef.current?.send({ type: "submit_answer", roundIndex: round.index, answer });
      },
      requestHint: () => {
        const round = stateRef.current.round;
        if (!round || round.you.lock) return;
        socketRef.current?.send({ type: "request_hint", roundIndex: round.index });
      },
      setNickname: (name) => {
        const nickname = name.trim();
        if (nickname) socketRef.current?.send({ type: "set_nickname", nickname });
      },
      leave: () => socketRef.current?.send({ type: "leave_room" }),
    }),
    [],
  );

  const value = useMemo(() => ({ state, actions, clockOffset }), [state, actions, clockOffset]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = (): Ctx => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
};
