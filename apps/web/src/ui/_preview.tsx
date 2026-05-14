import type { ReactNode } from "react";
import { Button } from "~/ui/button";
import { Input } from "~/ui/input";
import { StartScreenHeader } from "~/ui/start-screens/header";

type PreviewEntry = {
  id: string;
  name: string;
  render: () => ReactNode;
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
        <Input placeholder="122-000" />
        <Input defaultValue="500 - 900" />
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
        <StartScreenHeader title="Join Game" desc="Join a game by entering the code below" />
      </div>
    ),
  },
];
