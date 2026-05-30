// The REST CreateRoomResponse.wsUrl is a relative path; the WS handler keys off
// the room + gameId query params, so we build the absolute URL against the
// current origin (the Vite proxy forwards /api/ws to the backend).
export const buildWsUrl = (roomCode: string, gameId: string): string => {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ room: roomCode.toUpperCase(), gameId });
  return `${proto}//${window.location.host}/api/ws?${params.toString()}`;
};
