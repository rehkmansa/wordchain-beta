import { type ReactNode, useState } from "react";
import { AvatarStack } from "~/ui/avatar";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import { Card } from "~/ui/card";
import { ConfirmModal } from "~/ui/confirm-modal";
import { CountdownBar, CountdownRing } from "~/ui/countdown";
import { Emoji } from "~/ui/emoji";
import { CheckIcon, HintIcon, PeopleIcon } from "~/ui/icons";
import { Input } from "~/ui/input";
import { RoomCode } from "~/ui/room-code";
import { SegmentedTabs } from "~/ui/segmented-tabs";
import { Slider } from "~/ui/slider";
import { StartScreenHeader } from "~/ui/start-screens/header";
import { Stepper } from "~/ui/stepper";
import { useToast } from "~/ui/toast";
import { Toggle } from "~/ui/toggle";
import { WordTile } from "~/ui/word-tile";

type PreviewEntry = {
  id: string;
  name: string;
  render: () => ReactNode;
};

const PurpleStage = ({ children }: { children: ReactNode }) => (
  <div className="w-full rounded-2xl bg-linear-to-b from-brand-purple-500 to-brand-purple-700 p-8">
    {children}
  </div>
);

const SAMPLE_PLAYERS = [
  { id: "a", nickname: "Okpa" },
  { id: "b", nickname: "Rehk" },
  { id: "c", nickname: "Ada Lovelace" },
  { id: "d", nickname: "3mmie" },
  { id: "e", nickname: "Steady AI" },
  { id: "f", nickname: "Zoe" },
  { id: "g", nickname: "More" },
];

const SliderDemo = () => {
  const [v, setV] = useState(10);
  return (
    <div className="w-full max-w-md">
      <Slider value={v} min={3} max={20} onChange={setV} ariaLabel="Chain length" />
    </div>
  );
};

const StepperDemo = () => {
  const presets = [10, 15, 20, 30, 60];
  const [i, setI] = useState(1);
  return (
    <Stepper
      value={`${presets[i]}s`}
      onDecrement={() => setI((p) => Math.max(0, p - 1))}
      onIncrement={() => setI((p) => Math.min(presets.length - 1, p + 1))}
      canDecrement={i > 0}
      canIncrement={i < presets.length - 1}
    />
  );
};

const ToggleDemo = () => {
  const [on, setOn] = useState(true);
  return <Toggle checked={on} onChange={setOn} label="Elimination" />;
};

const TabsDemo = () => {
  const [tab, setTab] = useState<"slate" | "board">("slate");
  return (
    <div className="w-full max-w-md">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "slate", label: "Game Slate" },
          { value: "board", label: "Leaderboard" },
        ]}
      />
    </div>
  );
};

const CountdownDemo = () => (
  <PurpleStage>
    <div className="flex flex-col gap-6">
      <CountdownBar remaining={9000} total={15000} />
      <CountdownBar remaining={6000} total={15000} />
      <CountdownBar remaining={2400} total={15000} />
      <div className="flex gap-6">
        <CountdownRing remaining={9000} total={15000} />
        <CountdownRing remaining={6000} total={15000} />
        <CountdownRing remaining={2400} total={15000} />
      </div>
    </div>
  </PurpleStage>
);

const ToastDemo = () => {
  const { show, viewport } = useToast();
  return (
    <>
      <Button className="w-auto px-6" onClick={() => show("Code copied")}>
        Trigger toast
      </Button>
      {viewport}
    </>
  );
};

const ModalDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="w-auto px-6" onClick={() => setOpen(true)}>
        Open confirm
      </Button>
      <ConfirmModal
        open={open}
        title="Disband game?"
        body="This ends the game for everyone in the room."
        confirmLabel="Disband"
        destructive
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};

export const previews: PreviewEntry[] = [
  {
    id: "button",
    name: "Button",
    render: () => (
      <div className="flex w-full max-w-md flex-col gap-4">
        <Button>Join Room</Button>
        <Button disabled>Join Room</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="outline" disabled>
          Outline
        </Button>
      </div>
    ),
  },
  {
    id: "input",
    name: "Input",
    render: () => (
      <div className="flex w-full max-w-md flex-col gap-4">
        <Input placeholder="JVQEPT" />
        <Input defaultValue="HEADMASTER" />
      </div>
    ),
  },
  {
    id: "start-screens/header",
    name: "StartScreenHeader",
    render: () => (
      <div className="flex flex-col items-center gap-12">
        <StartScreenHeader
          title="Word Chains"
          desc="Relax, explore, and enjoy simple word puzzles at your own pace."
        />
      </div>
    ),
  },
  {
    id: "card",
    name: "Card",
    render: () => (
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card className="p-6">Solid surface</Card>
        <PurpleStage>
          <div className="flex flex-col gap-3">
            <Card variant="panel" className="p-5 text-white">
              Translucent panel
            </Card>
            <Card variant="panel-strong" className="p-5 text-white">
              Stronger panel
            </Card>
          </div>
        </PurpleStage>
      </div>
    ),
  },
  {
    id: "badge",
    name: "Badge",
    render: () => (
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="gold" icon={<Emoji name="fire" size={14} />}>
          1,840 pts
        </Badge>
        <Badge tone="purple" icon={<PeopleIcon size={14} variant="Bold" />}>
          24 players
        </Badge>
        <Badge tone="success" icon={<CheckIcon size={14} variant="Bold" />}>
          Solved
        </Badge>
        <Badge tone="danger">Missed</Badge>
        <Badge tone="neutral">MAX</Badge>
      </div>
    ),
  },
  {
    id: "avatar",
    name: "Avatar stack",
    render: () => (
      <PurpleStage>
        <AvatarStack players={SAMPLE_PLAYERS} />
      </PurpleStage>
    ),
  },
  { id: "slider", name: "Slider", render: () => <SliderDemo /> },
  { id: "stepper", name: "Stepper", render: () => <StepperDemo /> },
  { id: "toggle", name: "Toggle", render: () => <ToggleDemo /> },
  { id: "segmented-tabs", name: "SegmentedTabs", render: () => <TabsDemo /> },
  { id: "room-code", name: "RoomCode", render: () => <RoomCode code="JVQEPT" /> },
  { id: "countdown", name: "Countdown", render: () => <CountdownDemo /> },
  { id: "toast", name: "Toast", render: () => <ToastDemo /> },
  { id: "confirm-modal", name: "ConfirmModal", render: () => <ModalDemo /> },
  {
    id: "hint",
    name: "Hint icon + emoji",
    render: () => (
      <div className="flex items-center gap-6">
        <HintIcon size={28} variant="Bold" className="text-amber-500" />
        <Emoji name="trophy" size={40} />
        <Emoji name="fire" size={40} />
        <Emoji name="medalGold" size={40} />
        <Emoji name="heartBroken" size={40} />
      </div>
    ),
  },
  {
    id: "word-tile",
    name: "WordTile",
    render: () => (
      <PurpleStage>
        <div className="flex flex-wrap items-center gap-2">
          <WordTile char="H" variant="visible" />
          <WordTile char="E" variant="visible" />
          <WordTile char="A" variant="visible" />
          <WordTile char="D" variant="visible" />
          <span className="w-3" />
          <WordTile char="M" variant="hint" />
          <WordTile variant="blank" />
          <WordTile variant="blank" />
          <WordTile char="T" variant="typed" />
          <WordTile char="E" variant="correct" />
          <WordTile char="R" variant="wrong" />
        </div>
      </PurpleStage>
    ),
  },
];
