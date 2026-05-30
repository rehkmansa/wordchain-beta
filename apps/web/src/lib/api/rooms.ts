import type { CreateRoomResponse, GameMode, GameSettings, GetRoomResponse } from "@repo/shared";
import { ApiError, apiFetch } from "./client";

export const createRoom = (mode: GameMode, settings: GameSettings): Promise<CreateRoomResponse> =>
  apiFetch<CreateRoomResponse>("/rooms", {
    method: "POST",
    body: JSON.stringify({ mode, settings }),
  });

type GetRoomResult = { ok: true; room: GetRoomResponse } | { ok: false; code: string };

// Join precheck. Maps the REST error envelope to a discriminated result so the
// join/lobby screens can render copy per code instead of throwing.
export const getRoom = async (code: string): Promise<GetRoomResult> => {
  try {
    const room = await apiFetch<GetRoomResponse>(`/rooms/${code.toUpperCase()}`);
    return { ok: true, room };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, code: e.code };
    throw e;
  }
};
