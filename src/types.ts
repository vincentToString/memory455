export type Status = "running" | "accepted" | "rejected" | "stuck";

export type MachineState = {
  id: string;
  label: string;
  x: number;
  y: number;
  start?: boolean;
  accept?: boolean;
  reject?: boolean;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
};

export type AutomatonExample = {
  id: string;
  title: string;
  kind: "DFA" | "NFA";
  language: string;
  alphabet: string[];
  defaultInput: string;
  states: MachineState[];
  transitions: Record<string, Record<string, string[]>>;
};

export type AutomatonFrame = {
  step: number;
  inputIndex: number;
  activeStates: string[];
  consumed: string;
  currentSymbol: string;
  remaining: string;
  status: Status;
  lastMove: string;
  highlightedEdges: string[];
};

export type PdaTransition = {
  id: string;
  from: string;
  to: string;
  read: string | null;
  pop: string | null;
  push: string[];
  label: string;
  requireInputEnd?: boolean;
};

export type PdaExample = {
  id: string;
  title: string;
  language: string;
  defaultInput: string;
  acceptanceMode: "final-state" | "empty-stack" | "both";
  startState: string;
  acceptStates: string[];
  startStack: string[];
  stackBottomMarker?: string;
  states: MachineState[];
  transitions: PdaTransition[];
};

export type PdaFrame = {
  step: number;
  state: string;
  inputIndex: number;
  consumed: string;
  currentSymbol: string;
  remaining: string;
  stack: string[];
  status: Status;
  lastMove: string;
  highlightedEdges: string[];
};

export type TuringTransition = {
  id: string;
  from: string;
  to: string;
  read: string;
  write: string;
  move: "L" | "R" | "S";
  label: string;
};

export type TuringExample = {
  id: string;
  title: string;
  task: string;
  defaultInput: string;
  blank: string;
  startState: string;
  acceptStates: string[];
  rejectStates: string[];
  states: MachineState[];
  transitions: TuringTransition[];
};

export type TapeCell = {
  index: number;
  symbol: string;
};

export type TuringFrame = {
  step: number;
  state: string;
  head: number;
  tape: TapeCell[];
  status: Status;
  lastMove: string;
  highlightedEdges: string[];
};
