import { StartScreenHeader } from "./header";

export default {
  name: "StartScreenHeader",
  render: () => (
    <div className="flex flex-col gap-12 items-center">
      <StartScreenHeader
        title="Word Chains"
        desc="Relax, explore, and enjoy simple word puzzles at your own pace."
      />
      <StartScreenHeader title="Join Game" desc="Join a game by entering the code below" />
      <StartScreenHeader title="Create Game" desc="Game settings will go here." />
    </div>
  ),
};
