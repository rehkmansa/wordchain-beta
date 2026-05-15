# Roadmap

## Current Priority

**Backend foundation (V1)** — building from the design captured in [DESIGN.md](./DESIGN.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [API.md](./API.md), and [DATA-MODEL.md](./DATA-MODEL.md).

Build sequence and exit criteria for each phase live in [wip/backend-foundation-plan.md](../wip/backend-foundation-plan.md).

High-level phase order:
1. Schema + auth (SQLite, better-auth, anon flow)
2. Corpus pipeline (generation → frequency gate → graph storage)
3. REST surface (room create/join, game-by-room)
4. WebSocket layer (clock sync, room manager, connection tracker)
5. Round engine (scheduler, answer validation, scoring, hints, streaks)
6. Procedural AI opponent (rubber-banding, liveness events)
7. Snapshot recovery (round-end snapshots, crash rehydrate)
8. Frontend integration (swap mock state for live WS)
9. Hardening (rate limits, RTT exploit mitigations, room TTL sweeps)

## Up Next

After V1 backend foundation lands and frontend is wired up:
- Polish pass on the corpus (additional generation runs, manual QA of low-frequency pairs)
- Mobile-responsive UI pass
- Game animations (letter reveal, round transitions, win/lose)
- Production deploy (Contabo VPS, Docker, Caddy)

## Backlog

- Pro tier gating + payment integration (token economy)
- Leaderboards (per-mode, daily/weekly)
- Friends list and direct-invite matchmaking
- Rematch as first-class flow (preserve scores across N games)
- User-submitted phrase pairs with moderation queue
- AI-assisted chain/phrase validation (post-MVP, gated behind pro)
- Spectator mode
- Mobile app wrap (Capacitor)
- Push notifications (invites, "your friend just challenged you")
- Multi-server room sharding once single-process hits limits
- Replay viewer (uses `game_rounds` history)
