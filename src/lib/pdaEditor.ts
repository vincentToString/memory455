import type { MachineState, PdaExample, PdaTransition } from "../types";
import { compactPdaLabel } from "./pdaLabels";

export type PdaTransitionDraft = {
  from: string;
  read: string;
  pop: string;
  push: string;
  to: string;
  requireInputEnd: boolean;
};

export const PDA_EPSILON_LABEL = "\u03B5";
const PDA_EPSILON_ALIASES = ["eps", "epsilon", PDA_EPSILON_LABEL];

const PDA_CENTER_X = 330;
const PDA_CENTER_Y = 145;

export const layoutPdaStates = (states: MachineState[]) => {
  const count = states.length;
  if (count === 0) return [];

  if (count <= 4) {
    const spacing = count === 1 ? 0 : 200;
    const startX = PDA_CENTER_X - ((count - 1) * spacing) / 2;
    return states.map((state, index) => ({
      ...state,
      x: startX + index * spacing,
      y: PDA_CENTER_Y,
    }));
  }

  return states.map((state, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return {
      ...state,
      x: PDA_CENTER_X + Math.cos(angle) * 255,
      y: PDA_CENTER_Y + Math.sin(angle) * 118,
    };
  });
};

export const clonePda = (machine: PdaExample): PdaExample => ({
  ...machine,
  acceptanceMode: machine.acceptanceMode ?? "final-state",
  stackBottomMarker: machine.stackBottomMarker,
  startStack: [...machine.startStack],
  acceptStates: [...machine.acceptStates],
  states: layoutPdaStates(
    machine.states.map((state) => ({
      ...state,
      start: state.id === machine.startState,
      accept: machine.acceptStates.includes(state.id),
    })),
  ),
  transitions: machine.transitions.map((transition) => ({
    ...transition,
    push: [...transition.push],
  })),
});

export const makeBlankPda = (): PdaExample => ({
  id: "custom-pda",
  title: "PDA: custom machine",
  language: "L = { w | define the accepting states }",
  defaultInput: "",
  acceptanceMode: "final-state",
  startState: "q0",
  acceptStates: [],
  startStack: ["$"],
  stackBottomMarker: "$",
  states: layoutPdaStates([{ id: "q0", label: "q0", x: 0, y: 0, start: true }]),
  transitions: [],
});

export const normalizePdaStateId = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "");

export const nextPdaStateId = (states: MachineState[]) => {
  const existing = new Set(states.map((state) => state.id));
  for (let index = 0; index < 100; index += 1) {
    const candidate = `q${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `q${states.length}`;
};

export const parsePdaSymbols = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || PDA_EPSILON_ALIASES.includes(trimmed.toLowerCase())) return [];
  if (trimmed.includes(",") || /\s/.test(trimmed)) {
    return trimmed
      .split(/[\s,]+/)
      .map((symbol) => symbol.trim())
      .filter(Boolean);
  }
  return trimmed.split("");
};

export const pdaSymbolValue = (value: string) => {
  const symbols = parsePdaSymbols(value);
  return symbols[0] ?? null;
};

export const formatPdaTransitionLabel = ({
  read,
  pop,
  push,
}: {
  read: string | null;
  pop: string | null;
  push: string[];
}) => {
  const readLabel = read ?? PDA_EPSILON_LABEL;
  const popLabel = pop ?? PDA_EPSILON_LABEL;
  const pushLabel = push.length === 0 ? PDA_EPSILON_LABEL : push.join("");
  return `${readLabel}, ${popLabel} -> ${pushLabel}`;
};

export const defaultPdaTransitionDraft = (machine: PdaExample): PdaTransitionDraft => ({
  from: machine.states[0]?.id ?? "",
  read: "a",
  pop: machine.startStack[machine.startStack.length - 1] ?? PDA_EPSILON_LABEL,
  push: PDA_EPSILON_LABEL,
  to: machine.states[0]?.id ?? "",
  requireInputEnd: false,
});

export const addPdaState = (machine: PdaExample, rawStateId: string) => {
  const id = normalizePdaStateId(rawStateId);
  if (!id || machine.states.some((state) => state.id === id)) return machine;

  return {
    ...machine,
    states: layoutPdaStates([
      ...machine.states,
      { id, label: id, x: 0, y: 0, start: machine.states.length === 0 },
    ]),
  };
};

export const removePdaState = (machine: PdaExample, stateId: string) => {
  if (machine.states.length <= 1) return machine;
  const states = machine.states.filter((state) => state.id !== stateId);
  const startState = machine.startState === stateId ? states[0].id : machine.startState;
  const acceptStates = machine.acceptStates.filter((id) => id !== stateId);
  const transitions = machine.transitions.filter(
    (transition) => transition.from !== stateId && transition.to !== stateId,
  );

  return {
    ...machine,
    startState,
    acceptStates,
    states: layoutPdaStates(
      states.map((state) => ({
        ...state,
        start: state.id === startState,
        accept: acceptStates.includes(state.id),
      })),
    ),
    transitions,
  };
};

export const setPdaStartState = (machine: PdaExample, stateId: string) => ({
  ...machine,
  startState: stateId,
  states: machine.states.map((state) => ({ ...state, start: state.id === stateId })),
});

export const togglePdaAcceptState = (machine: PdaExample, stateId: string) => {
  const acceptStates = machine.acceptStates.includes(stateId)
    ? machine.acceptStates.filter((id) => id !== stateId)
    : [...machine.acceptStates, stateId];

  return {
    ...machine,
    acceptStates,
    states: machine.states.map((state) => ({
      ...state,
      accept: acceptStates.includes(state.id),
    })),
  };
};

export const updatePdaStartStack = (machine: PdaExample, rawStack: string) => {
  const startStack = parsePdaSymbols(rawStack);
  return { ...machine, startStack };
};

export const updatePdaAcceptanceMode = (
  machine: PdaExample,
  acceptanceMode: PdaExample["acceptanceMode"],
) => ({
  ...machine,
  acceptanceMode,
});

export const updatePdaStackBottomMarker = (machine: PdaExample, rawMarker: string) => {
  const marker = rawMarker.trim()[0];
  if (!marker) return { ...machine, stackBottomMarker: undefined };

  const previousMarker = machine.stackBottomMarker;
  const startStack =
    machine.startStack.length === 0
      ? [marker]
      : machine.startStack[0] === previousMarker
        ? [marker, ...machine.startStack.slice(1)]
        : machine.startStack;

  return { ...machine, stackBottomMarker: marker, startStack };
};

export const addPdaTransition = (machine: PdaExample, draft: PdaTransitionDraft) => {
  const read = pdaSymbolValue(draft.read);
  const pop = pdaSymbolValue(draft.pop);
  const push = parsePdaSymbols(draft.push);
  const nextTransition: PdaTransition = {
    id: `pda-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    from: draft.from,
    to: draft.to,
    read,
    pop,
    push,
    requireInputEnd: draft.requireInputEnd || undefined,
    label: formatPdaTransitionLabel({ read, pop, push }),
  };

  return {
    ...machine,
    transitions: [...machine.transitions, nextTransition],
  };
};

export const removePdaTransition = (machine: PdaExample, transitionId: string) => ({
  ...machine,
  transitions: machine.transitions.filter((transition) => transition.id !== transitionId),
});

export const pdaTransitionDisplay = (transition: PdaTransition) => compactPdaLabel(transition.label);
