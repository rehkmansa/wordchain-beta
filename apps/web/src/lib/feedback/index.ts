// Importing the sinks registers them on the bus (side-effect imports).
import "./audio-sink";
import "./haptics";

export { emitFeedback } from "./bus";
export { deriveFeedback } from "./events";
export { useFeedback } from "./use-feedback";
