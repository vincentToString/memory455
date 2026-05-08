import type {
  AutomatonExample,
  AutomatonFrame,
  PdaExample,
  PdaFrame,
  PdaTransition,
  Status,
  TapeCell,
  TuringExample,
  TuringFrame,
} from "../types";

const EPSILON = "";
const MAX_STEPS = 120;

const formatStatus = (status: Status) => {
  if (status === "accepted") return "accepted";
  if (status === "rejected") return "rejected";
  if (status === "stuck") return "stuck";
  return "running";
};

const uniqueSorted = (items: string[]) => Array.from(new Set(items)).sort();

const epsilonClosure = (machine: AutomatonExample, states: string[]) => {
  const seen = new Set(states);
  const stack = [...states];

  while (stack.length > 0) {
    const state = stack.pop()!;
    const next = machine.transitions[state]?.[EPSILON] ?? [];

    for (const candidate of next) {
      if (!seen.has(candidate)) {
        seen.add(candidate);
        stack.push(candidate);
      }
    }
  }

  return uniqueSorted([...seen]);
};

const automatonStatus = (
  machine: AutomatonExample,
  activeStates: string[],
  inputIndex: number,
  input: string,
): Status => {
  if (activeStates.length === 0) return machine.kind === "DFA" ? "rejected" : "stuck";
  if (inputIndex < input.length) return "running";

  const accepting = new Set(machine.states.filter((state) => state.accept).map((state) => state.id));
  return activeStates.some((state) => accepting.has(state)) ? "accepted" : "rejected";
};

export const makeAutomatonTrace = (machine: AutomatonExample, input: string): AutomatonFrame[] => {
  const starts = machine.states.filter((state) => state.start).map((state) => state.id);
  let activeStates = epsilonClosure(machine, starts);
  const frames: AutomatonFrame[] = [
    {
      step: 0,
      inputIndex: 0,
      activeStates,
      consumed: "",
      currentSymbol: input[0] ?? "",
      remaining: input,
      status: automatonStatus(machine, activeStates, 0, input),
      lastMove: "initial configuration",
      highlightedEdges: [],
    },
  ];

  for (let index = 0; index < input.length && activeStates.length > 0; index += 1) {
    const symbol = input[index];
    const destinations: string[] = [];
    const highlightedEdges: string[] = [];

    for (const state of activeStates) {
      const nextStates = machine.transitions[state]?.[symbol] ?? [];
      for (const nextState of nextStates) {
        destinations.push(nextState);
        highlightedEdges.push(`${state}->${nextState}:${symbol}`);
      }
    }

    activeStates = epsilonClosure(machine, destinations);
    const nextIndex = index + 1;
    const status = automatonStatus(machine, activeStates, nextIndex, input);
    frames.push({
      step: nextIndex,
      inputIndex: nextIndex,
      activeStates,
      consumed: input.slice(0, nextIndex),
      currentSymbol: input[nextIndex] ?? "",
      remaining: input.slice(nextIndex),
      status,
      lastMove:
        destinations.length === 0
          ? `read ${symbol}; no transition`
          : `read ${symbol}; active = {${activeStates.join(", ")}}`,
      highlightedEdges,
    });
  }

  return frames;
};

const topOf = (stack: string[]) => stack[stack.length - 1] ?? "";

const transitionMatches = (
  transition: PdaTransition,
  state: string,
  input: string,
  inputIndex: number,
  stack: string[],
) => {
  if (transition.from !== state) return false;
  if (transition.requireInputEnd && inputIndex !== input.length) return false;
  if (transition.read !== null && input[inputIndex] !== transition.read) return false;
  if (transition.pop !== null && topOf(stack) !== transition.pop) return false;
  return true;
};

const pdaStatus = (
  machine: PdaExample,
  state: string,
  inputIndex: number,
  input: string,
  stack: string[],
): Status => {
  const inputConsumed = inputIndex === input.length;
  const finalStateAccepts = machine.acceptStates.includes(state);
  const emptyStackAccepts = stack.length === 0;

  if (!inputConsumed) return "running";
  if (machine.acceptanceMode === "empty-stack" && emptyStackAccepts) return "accepted";
  if (machine.acceptanceMode === "both" && finalStateAccepts && emptyStackAccepts) return "accepted";
  if ((machine.acceptanceMode ?? "final-state") === "final-state" && finalStateAccepts) return "accepted";
  return "running";
};

export const makePdaTrace = (machine: PdaExample, input: string): PdaFrame[] => {
  let state = machine.startState;
  let inputIndex = 0;
  let stack = [...machine.startStack];

  const frames: PdaFrame[] = [
    {
      step: 0,
      state,
      inputIndex,
      consumed: "",
      currentSymbol: input[0] ?? "",
      remaining: input,
      stack,
      status: pdaStatus(machine, state, inputIndex, input, stack),
      lastMove: "initial configuration",
      highlightedEdges: [],
    },
  ];

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    if (pdaStatus(machine, state, inputIndex, input, stack) === "accepted") break;

    const transition = machine.transitions.find((candidate) =>
      transitionMatches(candidate, state, input, inputIndex, stack),
    );

    if (!transition) {
      frames.push({
        step,
        state,
        inputIndex,
        consumed: input.slice(0, inputIndex),
        currentSymbol: input[inputIndex] ?? "",
        remaining: input.slice(inputIndex),
        stack,
        status: inputIndex === input.length ? "rejected" : "stuck",
        lastMove: "no matching transition",
        highlightedEdges: [],
      });
      break;
    }

    const nextStack = [...stack];
    if (transition.pop !== null) nextStack.pop();
    nextStack.push(...transition.push);

    const readLabel = transition.read ?? "\u03B5";
    const popLabel = transition.pop ?? "\u03B5";
    const pushLabel = transition.push.length === 0 ? "\u03B5" : transition.push.join("");

    state = transition.to;
    stack = nextStack;
    if (transition.read !== null) inputIndex += 1;

    frames.push({
      step,
      state,
      inputIndex,
      consumed: input.slice(0, inputIndex),
      currentSymbol: input[inputIndex] ?? "",
      remaining: input.slice(inputIndex),
      stack,
      status: pdaStatus(machine, state, inputIndex, input, stack),
      lastMove: `${readLabel}, ${popLabel} -> ${pushLabel}`,
      highlightedEdges: [transition.id],
    });
  }

  return frames;
};

const makeTape = (input: string, blank: string) => {
  const tape = new Map<number, string>();
  input.split("").forEach((symbol, index) => tape.set(index, symbol));
  if (input.length === 0) tape.set(0, blank);
  return tape;
};

const tapeWindow = (tape: Map<number, string>, head: number, blank: string): TapeCell[] => {
  const keys = [...tape.keys(), head];
  const min = Math.min(...keys, head - 4);
  const max = Math.max(...keys, head + 4);
  const cells: TapeCell[] = [];

  for (let index = min; index <= max; index += 1) {
    cells.push({ index, symbol: tape.get(index) ?? blank });
  }

  return cells;
};

const turingStatus = (machine: TuringExample, state: string): Status => {
  if (machine.acceptStates.includes(state)) return "accepted";
  if ((machine.rejectStates ?? []).includes(state)) return "rejected";
  return "running";
};

export const makeTuringTrace = (machine: TuringExample, input: string): TuringFrame[] => {
  let tape = makeTape(input, machine.blank);
  let head = 0;
  let state = machine.startState;

  const frames: TuringFrame[] = [
    {
      step: 0,
      state,
      head,
      tape: tapeWindow(tape, head, machine.blank),
      status: turingStatus(machine, state),
      lastMove: "initial configuration",
      highlightedEdges: [],
    },
  ];

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    if (turingStatus(machine, state) !== "running") break;

    const read = tape.get(head) ?? machine.blank;
    const transition = machine.transitions.find(
      (candidate) => candidate.from === state && candidate.read === read,
    );

    if (!transition) {
      frames.push({
        step,
        state,
        head,
        tape: tapeWindow(tape, head, machine.blank),
        status: "stuck",
        lastMove: `read ${read}; no transition`,
        highlightedEdges: [],
      });
      break;
    }

    const nextTape = new Map(tape);
    nextTape.set(head, transition.write);

    if (transition.move === "L") head -= 1;
    if (transition.move === "R") head += 1;

    state = transition.to;
    tape = nextTape;

    frames.push({
      step,
      state,
      head,
      tape: tapeWindow(tape, head, machine.blank),
      status: turingStatus(machine, state),
      lastMove: `${read} -> ${transition.write}, ${transition.move}`,
      highlightedEdges: [transition.id],
    });
  }

  const finalFrame = frames[frames.length - 1];
  if (finalFrame.status === "running" && frames.length > MAX_STEPS) {
    frames.push({ ...finalFrame, status: "rejected", lastMove: "step limit reached" });
  }

  return frames.map((frame) => ({
    ...frame,
    lastMove:
      frame.status !== "running" && frame.lastMove !== "initial configuration"
        ? `${frame.lastMove}; ${formatStatus(frame.status)}`
        : frame.lastMove,
  }));
};
