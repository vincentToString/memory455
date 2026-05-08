import type { AutomatonExample, MachineState } from "../types";

export const EPSILON_LABEL = "\u03B5";

export type TransitionDraft = {
  from: string;
  symbol: string;
  to: string;
};

export type AutomatonTransitionRow = {
  key: string;
  from: string;
  symbol: string;
  symbolLabel: string;
  to: string;
};

export type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
};

export type AutomatonValidation = {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  isValid: boolean;
};

export const copyTransitions = (transitions: AutomatonExample["transitions"]) =>
  Object.fromEntries(
    Object.entries(transitions).map(([state, bySymbol]) => [
      state,
      Object.fromEntries(
        Object.entries(bySymbol).map(([symbol, destinations]) => [symbol, [...destinations]]),
      ),
    ]),
  );

const GRAPH_CENTER_X = 420;
const GRAPH_CENTER_Y = 230;

export const layoutAutomatonStates = (states: MachineState[]): MachineState[] => {
  const count = states.length;
  if (count === 0) return [];

  if (count === 1) {
    return states.map((state, index) => ({
      ...state,
      x: GRAPH_CENTER_X,
      y: GRAPH_CENTER_Y,
    }));
  }

  if (count === 2) {
    return states.map((state, index) => ({
      ...state,
      x: index === 0 ? 240 : 600,
      y: GRAPH_CENTER_Y,
    }));
  }

  const radiusX = count === 3 ? 285 : 300;
  const radiusY = count === 3 ? 158 : 165;

  return states.map((state, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return {
      ...state,
      x: GRAPH_CENTER_X + Math.cos(angle) * radiusX,
      y: GRAPH_CENTER_Y + Math.sin(angle) * radiusY,
    };
  });
};

export const cloneAutomaton = (machine: AutomatonExample): AutomatonExample => ({
  ...machine,
  alphabet: [...machine.alphabet],
  states: layoutAutomatonStates(machine.states.map((state) => ({ ...state }))),
  transitions: copyTransitions(machine.transitions),
});

export const makeBlankAutomaton = (): AutomatonExample => ({
  id: "custom",
  title: "Custom automaton",
  kind: "DFA",
  language: "L = { w | define the accepting states }",
  alphabet: ["0", "1"],
  defaultInput: "",
  states: layoutAutomatonStates([{ id: "q0", label: "q0", x: 0, y: 0, start: true }]),
  transitions: {},
});

export const normalizeStateId = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "");

export const nextStateId = (states: MachineState[]) => {
  const existing = new Set(states.map((state) => state.id));
  for (let index = 0; index < 100; index += 1) {
    const candidate = `q${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `q${states.length}`;
};

export const parseAlphabet = (value: string) => {
  const symbols = value
    .split(/[\s,]+/)
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .filter((symbol) => !["eps", "epsilon", "\u03B5"].includes(symbol.toLowerCase()));

  return Array.from(new Set(symbols));
};

export const transitionSymbolOptions = (machine: AutomatonExample) =>
  machine.kind === "NFA" ? [...machine.alphabet, EPSILON_LABEL] : machine.alphabet;

export const defaultTransitionDraft = (machine: AutomatonExample): TransitionDraft => ({
  from: machine.states[0]?.id ?? "",
  symbol: transitionSymbolOptions(machine)[0] ?? "",
  to: machine.states[0]?.id ?? "",
});

export const transitionRows = (machine: AutomatonExample): AutomatonTransitionRow[] => {
  const rows: AutomatonTransitionRow[] = [];

  Object.entries(machine.transitions).forEach(([from, bySymbol]) => {
    Object.entries(bySymbol).forEach(([symbol, destinations]) => {
      destinations.forEach((to, index) => {
        rows.push({
          key: `${from}-${symbol || "eps"}-${to}-${index}`,
          from,
          symbol,
          symbolLabel: symbol || EPSILON_LABEL,
          to,
        });
      });
    });
  });

  return rows.sort((left, right) =>
    `${left.from}${left.symbolLabel}${left.to}`.localeCompare(
      `${right.from}${right.symbolLabel}${right.to}`,
    ),
  );
};

export const addStateToAutomaton = (machine: AutomatonExample, rawStateId: string) => {
  const id = normalizeStateId(rawStateId);
  if (!id || machine.states.some((state) => state.id === id)) return machine;

  const states = layoutAutomatonStates([
    ...machine.states,
    {
      id,
      label: id,
      x: 0,
      y: 0,
      start: machine.states.length === 0,
    },
  ]);

  return { ...machine, states };
};

export const removeStateFromAutomaton = (machine: AutomatonExample, stateId: string) => {
  const remainingStates = machine.states.filter((state) => state.id !== stateId);
  if (remainingStates.length === 0) return machine;

  if (!remainingStates.some((state) => state.start)) {
    remainingStates[0] = { ...remainingStates[0], start: true };
  }

  const transitions = copyTransitions(machine.transitions);
  delete transitions[stateId];

  Object.entries(transitions).forEach(([from, bySymbol]) => {
    Object.entries(bySymbol).forEach(([symbol, destinations]) => {
      const kept = destinations.filter((to) => to !== stateId);
      if (kept.length === 0) {
        delete transitions[from][symbol];
      } else {
        transitions[from][symbol] = kept;
      }
    });

    if (Object.keys(transitions[from]).length === 0) {
      delete transitions[from];
    }
  });

  return {
    ...machine,
    states: layoutAutomatonStates(remainingStates),
    transitions,
  };
};

export const setStartState = (machine: AutomatonExample, stateId: string): AutomatonExample => ({
  ...machine,
  states: machine.states.map((state) => ({ ...state, start: state.id === stateId })),
});

export const toggleAcceptState = (machine: AutomatonExample, stateId: string): AutomatonExample => ({
  ...machine,
  states: machine.states.map((state) =>
    state.id === stateId ? { ...state, accept: !state.accept } : state,
  ),
});

export const updateAutomatonKind = (
  machine: AutomatonExample,
  kind: AutomatonExample["kind"],
): AutomatonExample => {
  if (kind === machine.kind) return machine;

  if (kind === "NFA") {
    return { ...machine, kind };
  }

  const transitions: AutomatonExample["transitions"] = {};

  Object.entries(machine.transitions).forEach(([from, bySymbol]) => {
    Object.entries(bySymbol).forEach(([symbol, destinations]) => {
      if (!symbol || destinations.length === 0) return;
      transitions[from] = transitions[from] ?? {};
      transitions[from][symbol] = [destinations[0]];
    });
  });

  return { ...machine, kind, transitions };
};

export const updateAutomatonAlphabet = (machine: AutomatonExample, rawAlphabet: string) => {
  const alphabet = parseAlphabet(rawAlphabet);
  const allowed = new Set(machine.kind === "NFA" ? [...alphabet, ""] : alphabet);
  const transitions: AutomatonExample["transitions"] = {};

  Object.entries(machine.transitions).forEach(([from, bySymbol]) => {
    Object.entries(bySymbol).forEach(([symbol, destinations]) => {
      if (!allowed.has(symbol)) return;
      transitions[from] = transitions[from] ?? {};
      transitions[from][symbol] = [...destinations];
    });
  });

  return { ...machine, alphabet, transitions };
};

export const addAutomatonTransition = (
  machine: AutomatonExample,
  draft: TransitionDraft,
): AutomatonExample => {
  const symbol = draft.symbol === EPSILON_LABEL ? "" : draft.symbol;
  const stateIds = new Set(machine.states.map((state) => state.id));
  const symbolAllowed = symbol === "" ? machine.kind === "NFA" : machine.alphabet.includes(symbol);

  if (!stateIds.has(draft.from) || !stateIds.has(draft.to) || !symbolAllowed) return machine;

  const transitions = copyTransitions(machine.transitions);
  transitions[draft.from] = transitions[draft.from] ?? {};

  if (machine.kind === "DFA") {
    transitions[draft.from][symbol] = [draft.to];
    return { ...machine, transitions };
  }

  const destinations = transitions[draft.from][symbol] ?? [];
  transitions[draft.from][symbol] = Array.from(new Set([...destinations, draft.to]));
  return { ...machine, transitions };
};

export const removeAutomatonTransition = (
  machine: AutomatonExample,
  row: AutomatonTransitionRow,
): AutomatonExample => {
  const transitions = copyTransitions(machine.transitions);
  const destinations = transitions[row.from]?.[row.symbol] ?? [];
  const kept = destinations.filter((to) => to !== row.to);

  if (kept.length === 0) {
    delete transitions[row.from]?.[row.symbol];
  } else {
    transitions[row.from][row.symbol] = kept;
  }

  if (transitions[row.from] && Object.keys(transitions[row.from]).length === 0) {
    delete transitions[row.from];
  }

  return { ...machine, transitions };
};

export const validateAutomaton = (
  machine: AutomatonExample,
  input = "",
): AutomatonValidation => {
  const issues: ValidationIssue[] = [];
  const stateIds = new Set(machine.states.map((state) => state.id));
  const alphabet = new Set(machine.alphabet);
  const startStates = machine.states.filter((state) => state.start);
  const acceptStates = machine.states.filter((state) => state.accept);

  if (machine.states.length === 0) {
    issues.push({ severity: "error", message: "Add at least one state." });
  }

  if (startStates.length === 0) {
    issues.push({ severity: "error", message: "Choose one start state." });
  }

  if (startStates.length > 1) {
    issues.push({ severity: "error", message: "Use exactly one start state." });
  }

  if (machine.alphabet.length === 0) {
    issues.push({ severity: "warning", message: "The alphabet is empty." });
  }

  if (acceptStates.length === 0) {
    issues.push({
      severity: "warning",
      message: "No accept states are marked, so the language is empty.",
    });
  }

  const inputSymbols = Array.from(new Set(input.split("").filter((symbol) => !alphabet.has(symbol))));
  if (inputSymbols.length > 0) {
    issues.push({
      severity: "error",
      message: `Input uses symbols outside the alphabet: ${inputSymbols.join(", ")}.`,
    });
  }

  Object.entries(machine.transitions).forEach(([from, bySymbol]) => {
    if (!stateIds.has(from)) {
      issues.push({ severity: "error", message: `Transition starts from unknown state ${from}.` });
    }

    Object.entries(bySymbol).forEach(([symbol, destinations]) => {
      if (symbol === "" && machine.kind === "DFA") {
        issues.push({ severity: "error", message: "A DFA cannot use epsilon transitions." });
      }

      if (symbol !== "" && !alphabet.has(symbol)) {
        issues.push({
          severity: "error",
          message: `Transition reads ${symbol}, which is not in the alphabet.`,
        });
      }

      if (destinations.length === 0) {
        issues.push({ severity: "error", message: `Transition on ${symbol || EPSILON_LABEL} has no target.` });
      }

      destinations.forEach((to) => {
        if (!stateIds.has(to)) {
          issues.push({ severity: "error", message: `Transition targets unknown state ${to}.` });
        }
      });
    });
  });

  if (machine.kind === "DFA") {
    machine.states.forEach((state) => {
      machine.alphabet.forEach((symbol) => {
        const destinations = machine.transitions[state.id]?.[symbol] ?? [];
        if (destinations.length === 0) {
          issues.push({
            severity: "warning",
            message: `DFA state ${state.id} has no transition on ${symbol}; it will implicitly reject there.`,
          });
        }

        if (destinations.length > 1) {
          issues.push({
            severity: "error",
            message: `DFA state ${state.id} has multiple transitions on ${symbol}.`,
          });
        }
      });
    });
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;

  return {
    issues,
    errorCount,
    warningCount,
    isValid: errorCount === 0,
  };
};
