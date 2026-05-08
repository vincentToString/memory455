import type { AutomatonExample } from "../types";
import { cloneAutomaton } from "./automatonEditor";

const STORAGE_KEY = "memory455.savedAutomata.v1";

const isAutomatonLike = (value: unknown): value is AutomatonExample => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AutomatonExample>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    (candidate.kind === "DFA" || candidate.kind === "NFA") &&
    Array.isArray(candidate.alphabet) &&
    Array.isArray(candidate.states) &&
    Boolean(candidate.transitions)
  );
};

export const loadSavedAutomata = (): AutomatonExample[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return dedupeAutomata(parsed.filter(isAutomatonLike).map(cloneAutomaton));
  } catch {
    return [];
  }
};

export const saveSavedAutomata = (machines: AutomatonExample[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  } catch {
    // localStorage can fail in private or locked-down browser contexts.
  }
};

export const makeSavedAutomatonId = () =>
  `saved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const upsertSavedAutomaton = (
  machines: AutomatonExample[],
  machine: AutomatonExample,
): AutomatonExample[] => {
  const nextMachine = cloneAutomaton(machine);
  const index = machines.findIndex((item) => item.id === nextMachine.id);
  if (index === -1) return [nextMachine, ...machines];

  const nextMachines = [...machines];
  nextMachines[index] = nextMachine;
  return nextMachines;
};

const automatonStorageKey = (machine: AutomatonExample) =>
  JSON.stringify({
    title: machine.title,
    kind: machine.kind,
    language: machine.language,
    alphabet: machine.alphabet,
    defaultInput: machine.defaultInput,
    states: machine.states.map((state) => ({
      id: state.id,
      label: state.label,
      start: Boolean(state.start),
      accept: Boolean(state.accept),
    })),
    transitions: machine.transitions,
  });

const dedupeAutomata = (machines: AutomatonExample[]) => {
  const seen = new Set<string>();
  const deduped: AutomatonExample[] = [];

  machines.forEach((machine) => {
    const key = automatonStorageKey(machine);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(machine);
  });

  return deduped;
};
