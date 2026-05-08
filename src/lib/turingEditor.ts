import type { MachineState, TuringExample, TuringTransition } from "../types";

export type TuringTransitionDraft = {
  from: string;
  read: string;
  write: string;
  move: TuringTransition["move"];
  to: string;
};

const TM_CENTER_X = 330;
const TM_CENTER_Y = 145;

export const layoutTuringStates = (states: MachineState[]) => {
  const count = states.length;
  if (count === 0) return [];

  if (count <= 4) {
    const spacing = count === 1 ? 0 : 205;
    const startX = TM_CENTER_X - ((count - 1) * spacing) / 2;
    return states.map((state, index) => ({
      ...state,
      x: startX + index * spacing,
      y: TM_CENTER_Y,
    }));
  }

  return states.map((state, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return {
      ...state,
      x: TM_CENTER_X + Math.cos(angle) * 255,
      y: TM_CENTER_Y + Math.sin(angle) * 122,
    };
  });
};

export const cloneTuring = (machine: TuringExample): TuringExample => ({
  ...machine,
  rejectStates: [...(machine.rejectStates ?? [])],
  states: layoutTuringStates(
    machine.states.map((state) => ({
      ...state,
      start: state.id === machine.startState,
      accept: machine.acceptStates.includes(state.id),
      reject: (machine.rejectStates ?? []).includes(state.id),
    })),
  ),
  acceptStates: [...machine.acceptStates],
  transitions: machine.transitions.map((transition) => ({ ...transition })),
});

export const makeBlankTuring = (): TuringExample => ({
  id: "custom-tm",
  title: "TM: custom machine",
  task: "Define the tape rule this machine computes.",
  defaultInput: "",
  blank: "_",
  startState: "q0",
  acceptStates: [],
  rejectStates: [],
  states: layoutTuringStates([{ id: "q0", label: "q0", x: 0, y: 0, start: true }]),
  transitions: [],
});

export const normalizeTuringStateId = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "");

export const normalizeTapeSymbol = (value: string, fallback = "_") => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed[0] : fallback;
};

export const nextTuringStateId = (states: MachineState[]) => {
  const existing = new Set(states.map((state) => state.id));
  for (let index = 0; index < 100; index += 1) {
    const candidate = `q${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `q${states.length}`;
};

export const formatTuringTransitionLabel = ({
  read,
  write,
  move,
}: {
  read: string;
  write: string;
  move: TuringTransition["move"];
}) => `${read} -> ${write}, ${move}`;

export const defaultTuringTransitionDraft = (machine: TuringExample): TuringTransitionDraft => ({
  from: machine.states[0]?.id ?? "",
  read: machine.blank,
  write: machine.blank,
  move: "R",
  to: machine.states[0]?.id ?? "",
});

export const addTuringState = (machine: TuringExample, rawStateId: string) => {
  const id = normalizeTuringStateId(rawStateId);
  if (!id || machine.states.some((state) => state.id === id)) return machine;

  const startState = machine.states.length === 0 ? id : machine.startState;
  return {
    ...machine,
    startState,
    states: layoutTuringStates([
      ...machine.states,
      { id, label: id, x: 0, y: 0, start: id === startState },
    ]),
  };
};

export const removeTuringState = (machine: TuringExample, stateId: string) => {
  if (machine.states.length <= 1) return machine;

  const states = machine.states.filter((state) => state.id !== stateId);
  const startState = machine.startState === stateId ? states[0].id : machine.startState;
  const acceptStates = machine.acceptStates.filter((id) => id !== stateId);
  const rejectStates = (machine.rejectStates ?? []).filter((id) => id !== stateId);
  const transitions = machine.transitions.filter(
    (transition) => transition.from !== stateId && transition.to !== stateId,
  );

  return {
    ...machine,
    startState,
    acceptStates,
    rejectStates,
    states: layoutTuringStates(
      states.map((state) => ({
        ...state,
        start: state.id === startState,
        accept: acceptStates.includes(state.id),
        reject: rejectStates.includes(state.id),
      })),
    ),
    transitions,
  };
};

export const setTuringStartState = (machine: TuringExample, stateId: string) => ({
  ...machine,
  startState: stateId,
  states: machine.states.map((state) => ({ ...state, start: state.id === stateId })),
});

export const toggleTuringAcceptState = (machine: TuringExample, stateId: string) => {
  const acceptStates = machine.acceptStates.includes(stateId)
    ? machine.acceptStates.filter((id) => id !== stateId)
    : [...machine.acceptStates, stateId];
  const rejectStates = (machine.rejectStates ?? []).filter((id) => id !== stateId);

  return {
    ...machine,
    acceptStates,
    rejectStates,
    states: machine.states.map((state) => ({
      ...state,
      accept: acceptStates.includes(state.id),
      reject: rejectStates.includes(state.id),
    })),
  };
};

export const toggleTuringRejectState = (machine: TuringExample, stateId: string) => {
  const rejectStates = (machine.rejectStates ?? []).includes(stateId)
    ? (machine.rejectStates ?? []).filter((id) => id !== stateId)
    : [...(machine.rejectStates ?? []), stateId];
  const acceptStates = machine.acceptStates.filter((id) => id !== stateId);

  return {
    ...machine,
    acceptStates,
    rejectStates,
    states: machine.states.map((state) => ({
      ...state,
      accept: acceptStates.includes(state.id),
      reject: rejectStates.includes(state.id),
    })),
  };
};

export const updateTuringBlank = (machine: TuringExample, rawBlank: string) => ({
  ...machine,
  blank: normalizeTapeSymbol(rawBlank, machine.blank || "_"),
});

export const addTuringTransition = (machine: TuringExample, draft: TuringTransitionDraft) => {
  const read = normalizeTapeSymbol(draft.read, machine.blank);
  const write = normalizeTapeSymbol(draft.write, machine.blank);
  const label = formatTuringTransitionLabel({ read, write, move: draft.move });
  const nextTransition: TuringTransition = {
    id: `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    from: draft.from,
    to: draft.to,
    read,
    write,
    move: draft.move,
    label,
  };

  return {
    ...machine,
    transitions: [...machine.transitions, nextTransition],
  };
};

export const removeTuringTransition = (machine: TuringExample, transitionId: string) => ({
  ...machine,
  transitions: machine.transitions.filter((transition) => transition.id !== transitionId),
});

export const turingReadAlphabet = (machine: TuringExample) =>
  Array.from(new Set(machine.transitions.map((transition) => transition.read))).sort();

export const hasTuringReadConflict = (
  machine: TuringExample,
  draft: Pick<TuringTransitionDraft, "from" | "read">,
) => {
  const read = normalizeTapeSymbol(draft.read, machine.blank);
  return machine.transitions.some((transition) => transition.from === draft.from && transition.read === read);
};
