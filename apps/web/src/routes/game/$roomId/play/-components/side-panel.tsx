import type { PublicPlayer } from "@repo/shared";
import { useState } from "react";
import type { FeedEntry } from "~/lib/game/types";
import { cn } from "~/lib/utils";
import { MedalIcon, PeopleIcon } from "~/ui/icons";
import { ScrollArea } from "~/ui/scroll-area";
import { SegmentedTabs } from "~/ui/segmented-tabs";
import { GuessFeed } from "./guess-feed";
import { LeaderboardList } from "./leaderboard-list";

type Tab = "slate" | "board";

export const SidePanel = ({
  feed,
  players,
  youId,
  elimination,
  className,
}: {
  feed: FeedEntry[];
  players: PublicPlayer[];
  youId: string;
  elimination: boolean;
  className?: string;
}) => {
  const [tab, setTab] = useState<Tab>("slate");

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex h-full min-h-0 flex-1 flex-col rounded-3xl bg-white p-3 shadow-[0_8px_30px_rgba(31,18,77,0.12)]">
        <SegmentedTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "slate", label: "Game Slate", icon: <PeopleIcon size={17} variant="Bold" /> },
            { value: "board", label: "Leaderboard", icon: <MedalIcon size={17} variant="Bold" /> },
          ]}
        />
        <ScrollArea className="mt-3 min-h-0 flex-1" tone="purple">
          {tab === "slate" ? (
            <GuessFeed entries={feed} />
          ) : (
            <LeaderboardList players={players} youId={youId} elimination={elimination} />
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
