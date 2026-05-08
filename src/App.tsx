import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Binary,
  Braces,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CircleDot,
  RotateCcw,
} from "lucide-react";
import { automataExamples, pdaExamples, turingExamples } from "./data/machines";
import { AutomatonBuilder } from "./components/AutomatonBuilder";
import { PdaBuilder } from "./components/PdaBuilder";
import { TuringBuilder } from "./components/TuringBuilder";
import { FormattedMathText, LanguageDisplay } from "./components/LanguageDisplay";
import {
  type AutomatonValidation,
  cloneAutomaton,
  makeBlankAutomaton,
  validateAutomaton,
} from "./lib/automatonEditor";
import {
  loadSavedAutomata,
  makeSavedAutomatonId,
  saveSavedAutomata,
  upsertSavedAutomaton,
} from "./lib/automatonStorage";
import { clonePda, makeBlankPda } from "./lib/pdaEditor";
import { compactPdaLabel } from "./lib/pdaLabels";
import { makeAutomatonTrace, makePdaTrace, makeTuringTrace } from "./lib/simulators";
import { cloneTuring, makeBlankTuring, turingReadAlphabet } from "./lib/turingEditor";
import type {
  AutomatonExample,
  GraphEdge,
  MachineState,
  PdaExample,
  Status,
  TuringExample,
  TuringFrame,
  TuringTransition,
} from "./types";

type TabKey = "automata" | "pda" | "tm";

const tabs: Array<{ id: TabKey; label: string }> = [
  { id: "automata", label: "DFA / NFA" },
  { id: "pda", label: "PDA" },
  { id: "tm", label: "Turing Machine" },
];

const statusLabels: Record<Status, string> = {
  running: "running",
  accepted: "accepted",
  rejected: "rejected",
  stuck: "stuck",
};

const GRAPH_CENTER_X = 420;
const GRAPH_CENTER_Y = 230;

type GraphVariant = "automata" | "pda" | "tm";

type GraphConfig = {
  centerX: number;
  centerY: number;
  className: string;
  viewBox: string;
  nodeMin: number;
  nodeMax: number;
  nodeBase: number;
  nodeCharWidth: number;
  startDistance: number;
  startLabelDistance: number;
  selfLoopLabelDistance: number;
  selfLoopFallback: Point;
  reciprocalCurve: number;
  longCurve: number;
  normalCurve: number;
  longRouteSide?: -1 | 1;
  marker: {
    width: number;
    height: number;
    refX: number;
    refY: number;
    path: string;
  };
};

type PdaLegendItem = {
  id: string;
  number: number;
  label: string;
};

type TuringLegendItem = {
  id: string;
  number: number;
  from: string;
  to: string;
  label: string;
};

const graphConfigs: Record<GraphVariant, GraphConfig> = {
  automata: {
    centerX: GRAPH_CENTER_X,
    centerY: GRAPH_CENTER_Y,
    className: "automata-graph",
    viewBox: "-80 -120 1000 700",
    nodeMin: 48,
    nodeMax: 72,
    nodeBase: 30,
    nodeCharWidth: 5.2,
    startDistance: 118,
    startLabelDistance: 96,
    selfLoopLabelDistance: 110,
    selfLoopFallback: { x: 0, y: -1 },
    reciprocalCurve: 72,
    longCurve: 96,
    normalCurve: 52,
    marker: {
      width: 17,
      height: 17,
      refX: 13.5,
      refY: 5.5,
      path: "M0,0 L0,11 L16,5.5 z",
    },
  },
  pda: {
    centerX: 330,
    centerY: 145,
    className: "pda-graph",
    viewBox: "-85 -60 820 410",
    nodeMin: 42,
    nodeMax: 58,
    nodeBase: 27,
    nodeCharWidth: 4.2,
    startDistance: 68,
    startLabelDistance: 54,
    selfLoopLabelDistance: 74,
    selfLoopFallback: { x: 0, y: 1 },
    reciprocalCurve: 52,
    longCurve: 118,
    normalCurve: 0,
    longRouteSide: -1,
    marker: {
      width: 13,
      height: 13,
      refX: 10.2,
      refY: 4.8,
      path: "M0,0 L0,9.6 L12,4.8 z",
    },
  },
  tm: {
    centerX: 330,
    centerY: 145,
    className: "tm-graph",
    viewBox: "-70 -85 800 410",
    nodeMin: 44,
    nodeMax: 64,
    nodeBase: 28,
    nodeCharWidth: 4.6,
    startDistance: 82,
    startLabelDistance: 66,
    selfLoopLabelDistance: 88,
    selfLoopFallback: { x: 0, y: -1 },
    reciprocalCurve: 62,
    longCurve: 112,
    normalCurve: 42,
    marker: {
      width: 15,
      height: 15,
      refX: 12,
      refY: 5,
      path: "M0,0 L0,10 L14,5 z",
    },
  },
};

const DRAFT_AUTOMATON_ID = "draft";
const EPSILON_DISPLAY = "\u03B5";

const classNames = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(" ");

const joinSet = (items: string[]) => (items.length === 0 ? "{}" : `{ ${items.join(", ")} }`);

const comparableAutomaton = (machine: AutomatonExample, input: string) => ({
  title: machine.title,
  kind: machine.kind,
  language: machine.language,
  alphabet: machine.alphabet,
  defaultInput: input,
  states: machine.states.map((state) => ({
    id: state.id,
    label: state.label,
    start: Boolean(state.start),
    accept: Boolean(state.accept),
  })),
  transitions: machine.transitions,
});

const automataMatch = (left: AutomatonExample, leftInput: string, right: AutomatonExample, rightInput: string) =>
  JSON.stringify(comparableAutomaton(left, leftInput)) ===
  JSON.stringify(comparableAutomaton(right, rightInput));

const useTraceCursor = (traceLength: number, deps: unknown[]) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, deps);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(traceLength - 1, 0)));
  }, [traceLength]);

  return {
    index,
    setIndex,
    canBack: index > 0,
    canForward: index < traceLength - 1,
  };
};

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("automata");

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark">M455</div>
          <div>
            <div className="brand-name">Memory455</div>
            <div className="brand-subtitle">Computation traceboards for COMP 455</div>
          </div>
        </div>

        <nav className="tabs" aria-label="Traceboard modules">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={classNames("tab-button", activeTab === tab.id && "active")}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === "automata" && <AutomataTraceboard />}
        {activeTab === "pda" && <PdaTraceboard />}
        {activeTab === "tm" && <TuringTraceboard />}
      </main>
    </div>
  );
}

function AutomataTraceboard() {
  const [selectedId, setSelectedId] = useState(automataExamples[0].id);
  const [savedAutomata, setSavedAutomata] = useState<AutomatonExample[]>(loadSavedAutomata);
  const [machine, setMachine] = useState(() => cloneAutomaton(automataExamples[0]));
  const [input, setInput] = useState(machine.defaultInput);

  useEffect(() => {
    saveSavedAutomata(savedAutomata);
  }, [savedAutomata]);

  useEffect(() => {
    if (selectedId === DRAFT_AUTOMATON_ID) return;

    const saved = savedAutomata.find((item) => item.id === selectedId);
    if (saved) {
      const nextMachine = cloneAutomaton(saved);
      setMachine(nextMachine);
      setInput(nextMachine.defaultInput);
      return;
    }

    const selected = automataExamples.find((item) => item.id === selectedId) ?? automataExamples[0];
    const nextMachine = cloneAutomaton(selected);
    setMachine(nextMachine);
    setInput(nextMachine.defaultInput);
  }, [selectedId]);

  const selectedSource = useMemo(() => {
    if (selectedId === DRAFT_AUTOMATON_ID) return makeBlankAutomaton();
    return (
      savedAutomata.find((item) => item.id === selectedId) ??
      automataExamples.find((item) => item.id === selectedId) ??
      automataExamples[0]
    );
  }, [savedAutomata, selectedId]);
  const trace = useMemo(() => makeAutomatonTrace(machine, input), [machine, input]);
  const cursor = useTraceCursor(trace.length, [machine, input]);
  const frame = trace[cursor.index] ?? trace[0];
  const edges = useMemo(() => automatonEdges(machine), [machine]);
  const validation = useMemo(() => validateAutomaton(machine, input), [machine, input]);
  const selectedIsSaved = savedAutomata.some((item) => item.id === selectedId);
  const isDirty = !automataMatch(machine, input, selectedSource, selectedSource.defaultInput);
  const machineChoices = useMemo(
    () => [
      ...automataExamples.map((item) => ({
        id: item.id,
        title: item.id === selectedId && isDirty ? `Unsaved: ${machine.title}` : item.title,
      })),
      ...savedAutomata.map((item) => ({
        id: item.id,
        title: `${item.id === selectedId && isDirty ? "Unsaved saved" : "Saved"}: ${item.title}`,
      })),
      ...(selectedId === DRAFT_AUTOMATON_ID
        ? [{ id: DRAFT_AUTOMATON_ID, title: `Draft: ${machine.title}` }]
        : []),
    ],
    [isDirty, machine.title, savedAutomata, selectedId],
  );

  const handleMachineChange = (nextMachine: AutomatonExample) => {
    setMachine(cloneAutomaton({
      ...nextMachine,
      id: selectedId,
      defaultInput: input,
    }));
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const handleNewAutomaton = () => {
    const nextMachine = cloneAutomaton({
      ...makeBlankAutomaton(),
      id: DRAFT_AUTOMATON_ID,
      title: "Untitled automaton",
    });

    setSelectedId(DRAFT_AUTOMATON_ID);
    setMachine(nextMachine);
    setInput(nextMachine.defaultInput);
  };

  const handleResetAutomaton = () => {
    const resetMachine = cloneAutomaton(
      selectedId === DRAFT_AUTOMATON_ID ? makeBlankAutomaton() : selectedSource,
    );
    const nextMachine = selectedId === DRAFT_AUTOMATON_ID ? { ...resetMachine, id: DRAFT_AUTOMATON_ID } : resetMachine;

    setMachine(nextMachine);
    setInput(nextMachine.defaultInput);
  };

  const handleSaveAutomaton = () => {
    const nextId = selectedIsSaved ? selectedId : makeSavedAutomatonId();
    const machineToSave = cloneAutomaton({
      ...machine,
      id: nextId,
      defaultInput: input,
    });

    setSavedAutomata((current) => upsertSavedAutomaton(current, machineToSave));
    setSelectedId(nextId);
    setMachine(machineToSave);
  };

  const handleSaveAsAutomaton = () => {
    const machineToSave = cloneAutomaton({
      ...machine,
      id: makeSavedAutomatonId(),
      title: selectedIsSaved ? `${machine.title} copy` : machine.title,
      defaultInput: input,
    });

    setSavedAutomata((current) => upsertSavedAutomaton(current, machineToSave));
    setSelectedId(machineToSave.id);
    setMachine(machineToSave);
  };

  const handleDeleteAutomaton = () => {
    if (!selectedIsSaved) return;

    setSavedAutomata((current) => current.filter((item) => item.id !== selectedId));
    const fallback = cloneAutomaton(automataExamples[0]);
    setSelectedId(fallback.id);
    setMachine(fallback);
    setInput(fallback.defaultInput);
  };

  const handleMachineSelect = (nextId: string) => {
    if (nextId === selectedId) return;
    if (isDirty && !window.confirm("Discard unsaved changes to the current automaton?")) return;
    setSelectedId(nextId);
  };

  return (
    <section className="traceboard" aria-label="DFA and NFA traceboard">
      <BoardTop
        badge={machine.kind}
        title={machine.title}
        detail={<LanguageDisplay language={machine.language} alphabet={machine.alphabet} />}
        exampleId={selectedId}
        exampleLabel="Machine"
        examples={machineChoices}
        input={input}
        inputLabel={`Input over {${machine.alphabet.join(", ")}}`}
        onExampleChange={handleMachineSelect}
        onInputChange={handleInputChange}
      />

      <div className="trace-layout">
        <GraphView
          states={machine.states}
          edges={edges}
          activeStateIds={frame.activeStates}
          highlightedEdgeIds={frame.highlightedEdges}
          toolbar={<TraceControls cursor={cursor} frameStep={frame.step} traceLength={trace.length} compact />}
        />

        <aside className="memory-panel">
          <PanelTitle icon={<CircleDot size={18} />} title="Configuration" />
          <div className="kv-grid">
            <KeyValue label="Active states" value={joinSet(frame.activeStates)} />
            <KeyValue label="Consumed prefix" value={frame.consumed || EPSILON_DISPLAY} />
            <KeyValue label="Read next" value={frame.currentSymbol || "end"} />
            <KeyValue
              label="Unread suffix"
              value={frame.currentSymbol ? frame.remaining.slice(1) || EPSILON_DISPLAY : EPSILON_DISPLAY}
            />
          </div>

          <ValidationBanner validation={validation} />
          <InputTrack input={input} inputIndex={frame.inputIndex} />

          <div className="state-row">
            <StatusPill status={frame.status} />
            <span className="last-move">{frame.lastMove}</span>
          </div>
        </aside>
      </div>

      <AutomatonBuilder
        machine={machine}
        validation={validation}
        canDelete={selectedIsSaved}
        canSave={selectedIsSaved ? isDirty : true}
        isDirty={isDirty}
        isSaved={selectedIsSaved}
        onChange={handleMachineChange}
        onNew={handleNewAutomaton}
        onReset={handleResetAutomaton}
        onSave={handleSaveAutomaton}
        onSaveAs={handleSaveAsAutomaton}
        onDelete={handleDeleteAutomaton}
      />
    </section>
  );
}

function PdaTraceboard() {
  const [machine, setMachine] = useState(() => clonePda(pdaExamples[0]));
  const [input, setInput] = useState(machine.defaultInput);
  const trace = useMemo(() => makePdaTrace(machine, input), [machine, input]);
  const cursor = useTraceCursor(trace.length, [machine, input]);
  const frame = trace[cursor.index] ?? trace[0];
  const edges = useMemo(() => pdaEdges(machine), [machine]);
  const legendItems = useMemo(() => pdaLegendItems(machine), [machine]);
  const inputAlphabet = useMemo(() => pdaInputAlphabet(machine), [machine]);

  const handlePdaChange = (nextMachine: PdaExample) => {
    setMachine(clonePda(nextMachine));
  };

  const handleNewPda = () => {
    const nextMachine = makeBlankPda();
    setMachine(nextMachine);
    setInput(nextMachine.defaultInput);
  };

  const handleResetPda = () => {
    const nextMachine = clonePda(pdaExamples[0]);
    setMachine(nextMachine);
    setInput(nextMachine.defaultInput);
  };

  return (
    <section className="traceboard" aria-label="Pushdown automaton traceboard">
      <BoardTop
        badge="DPDA"
        title={machine.title}
        detail={<LanguageDisplay language={machine.language} />}
        exampleId={machine.id}
        examples={[machine]}
        input={input}
        inputLabel={
          inputAlphabet.length > 0 ? `Input over {${inputAlphabet.join(", ")}}` : "Input string"
        }
        onExampleChange={() => undefined}
        onInputChange={setInput}
      />

      <div className="trace-layout pda-layout">
        <GraphView
          states={machine.states}
          edges={edges}
          activeStateIds={[frame.state]}
          highlightedEdgeIds={frame.highlightedEdges}
          variant="pda"
          toolbar={<TraceControls cursor={cursor} frameStep={frame.step} traceLength={trace.length} compact />}
          legend={<PdaTransitionLegend items={legendItems} highlightedIds={frame.highlightedEdges} />}
        />

        <aside className="memory-panel stack-panel">
          <PanelTitle icon={<Braces size={18} />} title="Configuration" />
          <div className="kv-grid">
            <KeyValue label="Current state" value={frame.state} />
            <KeyValue label="Consumed prefix" value={frame.consumed || EPSILON_DISPLAY} />
            <KeyValue label="Read next" value={frame.currentSymbol || "end"} />
            <KeyValue
              label="Unread suffix"
              value={frame.currentSymbol ? frame.remaining.slice(1) || EPSILON_DISPLAY : EPSILON_DISPLAY}
            />
            <KeyValue label="Simulator" value="DPDA first match" />
            <KeyValue label="Acceptance" value={pdaAcceptanceLabel(machine.acceptanceMode)} />
            <KeyValue label="Stack bottom" value={machine.stackBottomMarker ?? "none"} />
          </div>

          <InputTrack input={input} inputIndex={frame.inputIndex} />
          <StackView stack={frame.stack} />

          <div className="state-row">
            <StatusPill status={frame.status} />
            <span className="last-move">{frame.lastMove}</span>
          </div>
        </aside>
      </div>

      <PdaBuilder
        machine={machine}
        onChange={handlePdaChange}
        onNew={handleNewPda}
        onReset={handleResetPda}
      />
    </section>
  );
}

function TuringTraceboard() {
  const [machine, setMachine] = useState(() => cloneTuring(turingExamples[0]));
  const [input, setInput] = useState(machine.defaultInput);
  const trace = useMemo(() => makeTuringTrace(machine, input), [machine, input]);
  const cursor = useTraceCursor(trace.length, [machine, input]);
  const frame = trace[cursor.index] ?? trace[0];
  const edges = useMemo(() => turingEdges(machine), [machine]);
  const legendItems = useMemo(() => turingLegendItems(machine), [machine]);
  const inputAlphabet = useMemo(() => turingInputAlphabet(machine), [machine]);
  const activeTransition = frame.highlightedEdges[0]
    ? machine.transitions.find((transition) => transition.id === frame.highlightedEdges[0])
    : undefined;

  const handleTuringChange = (nextMachine: TuringExample) => {
    setMachine(cloneTuring(nextMachine));
  };

  const handleNewTuring = () => {
    const nextMachine = makeBlankTuring();
    setMachine(nextMachine);
    setInput(nextMachine.defaultInput);
  };

  const handleResetTuring = () => {
    const nextMachine = cloneTuring(turingExamples[0]);
    setMachine(nextMachine);
    setInput(nextMachine.defaultInput);
  };

  return (
    <section className="traceboard" aria-label="Turing machine traceboard">
      <BoardTop
        badge="TM"
        title={machine.title}
        detail={machine.task}
        exampleId={machine.id}
        examples={[machine]}
        input={input}
        inputLabel={
          inputAlphabet.length > 0 ? `Input over {${inputAlphabet.join(", ")}}` : "Input string"
        }
        onExampleChange={() => undefined}
        onInputChange={setInput}
      />

      <div className="tm-workspace">
        <TuringTapePanel frame={frame} blank={machine.blank} transition={activeTransition} />

        <div className="tm-machine-layout">
          <GraphView
            states={machine.states}
            edges={edges}
            activeStateIds={[frame.state]}
            highlightedEdgeIds={frame.highlightedEdges}
            variant="tm"
            toolbar={<TraceControls cursor={cursor} frameStep={frame.step} traceLength={trace.length} compact />}
            legend={<TuringTransitionLegend items={legendItems} highlightedIds={frame.highlightedEdges} />}
          />

          <aside className="memory-panel tape-panel">
            <PanelTitle icon={<Binary size={18} />} title="Configuration" />
            <div className="kv-grid">
              <KeyValue label="Current state" value={frame.state} />
              <KeyValue label="Head index" value={String(frame.head)} />
              <KeyValue label="Read under head" value={tapeHeadSymbol(frame, machine.blank)} />
              <KeyValue label="Blank" value={machine.blank} />
              <KeyValue label="Rule used" value={activeTransition?.label ?? "none"} />
              <KeyValue label="Reject states" value={joinSet(machine.rejectStates ?? [])} />
              <KeyValue label="Step" value={String(frame.step)} />
            </div>

            <div className="state-row">
              <StatusPill status={frame.status} />
              <span className="last-move">{frame.lastMove}</span>
            </div>
          </aside>
        </div>
      </div>

      <TuringBuilder
        machine={machine}
        onChange={handleTuringChange}
        onNew={handleNewTuring}
        onReset={handleResetTuring}
      />
    </section>
  );
}

type BoardTopProps<T extends { id: string; title: string }> = {
  badge: string;
  title: string;
  detail: ReactNode;
  exampleId: string;
  exampleLabel?: string;
  examples: T[];
  input: string;
  inputLabel: string;
  onExampleChange: (id: string) => void;
  onInputChange: (value: string) => void;
};

function BoardTop<T extends { id: string; title: string }>({
  badge,
  title,
  detail,
  exampleId,
  exampleLabel = "Example",
  examples,
  input,
  inputLabel,
  onExampleChange,
  onInputChange,
}: BoardTopProps<T>) {
  return (
    <div className="board-top">
      <div className="board-copy">
        <span className="badge">{badge}</span>
        <h1>
          <FormattedMathText text={title} />
        </h1>
        {typeof detail === "string" ? <p>{detail}</p> : detail}
      </div>

      <div className="setup-bar">
        <label>
          <span>{exampleLabel}</span>
          <select value={exampleId} onChange={(event) => onExampleChange(event.target.value)}>
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>{inputLabel}</span>
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value.trim())}
            spellCheck={false}
          />
        </label>
      </div>
    </div>
  );
}

type Cursor = ReturnType<typeof useTraceCursor>;

function TraceControls({
  cursor,
  frameStep,
  traceLength,
  compact = false,
}: {
  cursor: Cursor;
  frameStep: number;
  traceLength: number;
  compact?: boolean;
}) {
  return (
    <div className={classNames("trace-controls", compact && "compact")} aria-label="Trace controls">
      <button type="button" title="Reset" onClick={() => cursor.setIndex(0)} disabled={!cursor.canBack}>
        <RotateCcw size={18} />
      </button>
      <button
        type="button"
        title="Previous"
        onClick={() => cursor.setIndex((current) => Math.max(0, current - 1))}
        disabled={!cursor.canBack}
      >
        <ChevronLeft size={20} />
      </button>
      <div className="step-counter">
        <span>Step</span>
        <strong>
          {frameStep} / {Math.max(traceLength - 1, 0)}
        </strong>
      </div>
      <button
        type="button"
        title="Next"
        onClick={() => cursor.setIndex((current) => Math.min(traceLength - 1, current + 1))}
        disabled={!cursor.canForward}
      >
        <ChevronRight size={20} />
      </button>
      <button
        type="button"
        title="Finish"
        onClick={() => cursor.setIndex(traceLength - 1)}
        disabled={!cursor.canForward}
      >
        <ChevronsRight size={20} />
      </button>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  return <span className={classNames("status-pill", status)}>{statusLabels[status]}</span>;
}

function ValidationBanner({ validation }: { validation: AutomatonValidation }) {
  if (validation.issues.length === 0) {
    return (
      <div className="validation-banner valid">
        <strong>Valid automaton</strong>
        <span>Ready for this input.</span>
      </div>
    );
  }

  const primaryIssue = validation.issues[0];

  return (
    <div className={classNames("validation-banner", validation.isValid ? "warning" : "invalid")}>
      <strong>{validation.isValid ? "Warning" : "Invalid automaton"}</strong>
      <span>{primaryIssue.message}</span>
    </div>
  );
}

function InputTrack({ input, inputIndex }: { input: string; inputIndex: number }) {
  const consumed = input.slice(0, inputIndex);
  const readNext = input[inputIndex] ?? "";
  const unreadAfterNext = readNext ? input.slice(inputIndex + 1) : "";
  const symbols = input.length > 0 ? input.split("") : [];

  return (
    <div className="input-cursor-panel" aria-label="Input trace">
      <div className="input-readout">
        <div>
          <span>Consumed</span>
          <strong>{consumed || EPSILON_DISPLAY}</strong>
        </div>
        <div>
          <span>Read next</span>
          <strong>{readNext || "end"}</strong>
        </div>
        <div>
          <span>After that</span>
          <strong>{unreadAfterNext || EPSILON_DISPLAY}</strong>
        </div>
      </div>

      <div className="input-track">
        {symbols.map((symbol, index) => (
          <div
            key={`${symbol}-${index}`}
            className={classNames(
              "input-cell",
              index < inputIndex && "consumed",
              index === inputIndex && "current",
            )}
          >
            <span>{symbol}</span>
            {index === inputIndex && <small>read next</small>}
          </div>
        ))}
        {(input.length === 0 || inputIndex >= input.length) && (
          <div className="input-cell current end-cell">
            <span>end</span>
            <small>read head</small>
          </div>
        )}
      </div>
    </div>
  );
}

function StackView({ stack }: { stack: string[] }) {
  const topFirst = [...stack].reverse();

  return (
    <div className="stack-wrap">
      <div className="stack-title">
        <span>Stack</span>
        <strong>top</strong>
      </div>
      <div className="stack-box">
        {topFirst.length === 0 ? (
          <div className="stack-empty">{EPSILON_DISPLAY}</div>
        ) : (
          topFirst.map((symbol, index) => (
            <div key={`${symbol}-${index}`} className={classNames("stack-cell", index === 0 && "top")}>
              {symbol}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TapeView({ cells, head }: { cells: Array<{ index: number; symbol: string }>; head: number }) {
  return (
    <div className="tape-wrap">
      <div className="tape">
        {cells.map((cell) => (
          <div key={cell.index} className={classNames("tape-cell", cell.index === head && "head")}>
            <small>{cell.index}</small>
            <span>{cell.symbol}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TuringTapePanel({
  frame,
  blank,
  transition,
}: {
  frame: TuringFrame;
  blank: string;
  transition?: TuringTransition;
}) {
  const readSymbol = tapeHeadSymbol(frame, blank);

  return (
    <section className="tm-tape-panel" aria-label="Turing machine tape">
      <div className="tm-tape-header">
        <div>
          <span className="builder-eyebrow">Tape Memory</span>
          <h2>{frame.state}</h2>
        </div>
        <div className="tm-op-strip" aria-label="Current tape operation">
          <div>
            <span>Under head</span>
            <strong>{readSymbol}</strong>
          </div>
          <div>
            <span>Last write</span>
            <strong>{transition?.write ?? "-"}</strong>
          </div>
          <div>
            <span>Last move</span>
            <strong>{transition?.move ?? "-"}</strong>
          </div>
          <div>
            <span>Rule</span>
            <strong>{transition?.label ?? "initial"}</strong>
          </div>
        </div>
      </div>

      <div className="tm-wide-tape-wrap">
        <div className="tm-wide-tape">
          {frame.tape.map((cell) => (
            <div
              key={cell.index}
              className={classNames(
                "tm-wide-cell",
                cell.index === frame.head && "head",
                cell.symbol === blank && "blank",
              )}
            >
              <small>{cell.index}</small>
              <span>{cell.symbol}</span>
              {cell.index === frame.head && <b>{frame.state}</b>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function tapeHeadSymbol(frame: TuringFrame, blank: string) {
  return frame.tape.find((cell) => cell.index === frame.head)?.symbol ?? blank;
}

function PdaTransitionLegend({
  items,
  highlightedIds,
}: {
  items: PdaLegendItem[];
  highlightedIds: string[];
}) {
  const highlighted = new Set(highlightedIds);

  return (
    <div className="pda-transition-legend-wrap" aria-label="PDA transition legend">
      <div className="legend-title">
        <strong>Transition rules</strong>
        <span>Graph labels T1, T2, ... refer to these stack operations.</span>
      </div>
      <div className="pda-transition-legend">
        {items.map((item) => (
          <div key={item.id} className={classNames("legend-row", highlighted.has(item.id) && "active")}>
            <strong>T{item.number}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TuringTransitionLegend({
  items,
  highlightedIds,
}: {
  items: TuringLegendItem[];
  highlightedIds: string[];
}) {
  const highlighted = new Set(highlightedIds);

  return (
    <div className="pda-transition-legend-wrap" aria-label="Turing machine transition legend">
      <div className="legend-title">
        <strong>Transition rules</strong>
        <span>Graph labels T1, T2, ... refer to read, write, and move rules.</span>
      </div>
      <div className="tm-transition-legend">
        {items.map((item) => (
          <div key={item.id} className={classNames("tm-legend-row", highlighted.has(item.id) && "active")}>
            <strong>T{item.number}</strong>
            <span>{item.from}</span>
            <b>{item.label}</b>
            <span>{item.to}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraphView({
  states,
  edges,
  activeStateIds,
  highlightedEdgeIds,
  variant = "automata",
  toolbar,
  legend,
}: {
  states: MachineState[];
  edges: GraphEdge[];
  activeStateIds: string[];
  highlightedEdgeIds: string[];
  variant?: GraphVariant;
  toolbar?: ReactNode;
  legend?: ReactNode;
}) {
  const config = graphConfigs[variant];
  const stateMap = new Map(states.map((state) => [state.id, state]));
  const highlighted = new Set(highlightedEdgeIds);
  const active = new Set(activeStateIds);
  const selfLoopPorts = new Map(
    states.map((state) => [
      state.id,
      edges.some((edge) => edge.from === state.id && edge.to === state.id)
        ? chooseSelfLoopPort(state, config)
        : undefined,
    ]),
  );

  return (
    <div className={classNames("graph-panel", config.className)}>
      {toolbar && <div className="graph-toolbar">{toolbar}</div>}
      <svg viewBox={config.viewBox} role="img" aria-label="State diagram">
        <defs>
          <marker
            id={`${variant}-arrow`}
            markerWidth={config.marker.width}
            markerHeight={config.marker.height}
            refX={config.marker.refX}
            refY={config.marker.refY}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d={config.marker.path} className="arrow-head" />
          </marker>
          <marker
            id={`${variant}-arrow-active`}
            markerWidth={config.marker.width}
            markerHeight={config.marker.height}
            refX={config.marker.refX}
            refY={config.marker.refY}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d={config.marker.path} className="arrow-head active" />
          </marker>
        </defs>

        {states
          .filter((state) => state.start)
          .map((state) => {
            const startArrow = startArrowGeometry(state, config, selfLoopPorts.get(state.id));
            return (
              <g key={`start-${state.id}`} className="start-arrow">
                <path d={startArrow.path} markerEnd={`url(#${variant}-arrow)`} />
                <text x={startArrow.labelX} y={startArrow.labelY} textAnchor="middle">
                  start
                </text>
              </g>
            );
          })}

        {edges.map((edge) => {
          const from = stateMap.get(edge.from);
          const to = stateMap.get(edge.to);
          if (!from || !to) return null;
          const isActiveEdge = edge.id.split("|").some((id) => highlighted.has(id));
          const reciprocal = edges.some((candidate) => candidate.from === edge.to && candidate.to === edge.from);
          const geometry = edgeGeometry(from, to, reciprocal, config, selfLoopPorts.get(edge.from));
          return (
            <g key={edge.id} className={classNames("edge", isActiveEdge && "active")}>
              <path
                d={geometry.path}
                markerEnd={`url(#${variant}-arrow${isActiveEdge ? "-active" : ""})`}
              />
                <text x={geometry.labelX} y={geometry.labelY} textAnchor="middle">
                {edge.label.split(" / ").map((part, index) => (
                  <tspan key={part} x={geometry.labelX} dy={index === 0 ? 0 : 28}>
                    {part}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}

        {states.map((state) => (
          <g key={state.id} className={classNames("node", active.has(state.id) && "active")}>
            <circle cx={state.x} cy={state.y} r={nodeRadius(state, config)} />
            {state.accept && <circle className="accept-ring" cx={state.x} cy={state.y} r={nodeRadius(state, config) - 9} />}
            {state.reject && <circle className="reject-ring" cx={state.x} cy={state.y} r={nodeRadius(state, config) - 9} />}
            <text x={state.x} y={state.y + 6} textAnchor="middle">
              {state.label}
            </text>
          </g>
        ))}
      </svg>
      {legend && <div className="graph-legend">{legend}</div>}
    </div>
  );
}

type Point = {
  x: number;
  y: number;
};

type Port = Point & {
  angle: number;
  name: string;
};

const PORTS: Port[] = [
  { name: "top", angle: -90, x: 0, y: -1 },
  { name: "top-right", angle: -45, x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  { name: "right", angle: 0, x: 1, y: 0 },
  { name: "bottom-right", angle: 45, x: Math.SQRT1_2, y: Math.SQRT1_2 },
  { name: "bottom", angle: 90, x: 0, y: 1 },
  { name: "bottom-left", angle: 135, x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  { name: "left", angle: 180, x: -1, y: 0 },
  { name: "top-left", angle: -135, x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
];

function nodeRadius(state: MachineState, config: GraphConfig) {
  return Math.max(
    config.nodeMin,
    Math.min(config.nodeMax, config.nodeBase + state.label.length * config.nodeCharWidth),
  );
}

function normalize(dx: number, dy: number, fallback: Point): Point {
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) return fallback;
  return { x: dx / length, y: dy / length };
}

function closestPort(vector: Point) {
  return PORTS.reduce((best, port) => {
    const bestScore = best.x * vector.x + best.y * vector.y;
    const score = port.x * vector.x + port.y * vector.y;
    return score > bestScore ? port : best;
  }, PORTS[0]);
}

function chooseSelfLoopPort(state: MachineState, config: GraphConfig) {
  const outward = normalize(
    state.x - config.centerX,
    state.y - config.centerY,
    config.selfLoopFallback,
  );
  return closestPort(outward);
}

function rotatePort(port: Port, degrees: number) {
  const targetAngle = port.angle + degrees;
  const normalizedAngle = ((((targetAngle + 180) % 360) + 360) % 360) - 180;
  const angularDistance = (left: number, right: number) => {
    const distance = Math.abs(left - right) % 360;
    return Math.min(distance, 360 - distance);
  };

  return PORTS.reduce((best, candidate) => {
    const bestDistance = angularDistance(best.angle, normalizedAngle);
    const candidateDistance = angularDistance(candidate.angle, normalizedAngle);
    return candidateDistance < bestDistance ? candidate : best;
  }, PORTS[0]);
}

function startArrowGeometry(state: MachineState, config: GraphConfig, selfLoopPort?: Port) {
  const radius = nodeRadius(state, config);
  const outward = normalize(state.x - config.centerX, state.y - config.centerY, { x: -1, y: 0 });
  const approach = selfLoopPort ?? closestPort(outward);
  const port = selfLoopPort ? rotatePort(approach, -45) : approach;
  const start = {
    x: state.x + port.x * (radius + config.startDistance),
    y: state.y + port.y * (radius + config.startDistance),
  };
  const end = {
    x: state.x + port.x * (radius + 13),
    y: state.y + port.y * (radius + 13),
  };
  const label = {
    x: state.x + port.x * (radius + config.startLabelDistance),
    y: state.y + port.y * (radius + config.startLabelDistance) - 8,
  };

  return {
    path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    labelX: label.x,
    labelY: label.y,
  };
}

function edgeGeometry(
  from: MachineState,
  to: MachineState,
  reciprocal: boolean,
  config: GraphConfig,
  selfLoopPort?: Port,
) {
  if (from.id === to.id) {
    const radius = nodeRadius(from, config);
    const outward = selfLoopPort ?? chooseSelfLoopPort(from, config);
    const tangent = { x: -outward.y, y: outward.x };
    const start = {
      x: from.x - tangent.x * 27 + outward.x * (radius - 2),
      y: from.y - tangent.y * 27 + outward.y * (radius - 2),
    };
    const end = {
      x: from.x + tangent.x * 27 + outward.x * (radius - 2),
      y: from.y + tangent.y * 27 + outward.y * (radius - 2),
    };
    const controlOne = {
      x: from.x - tangent.x * 88 + outward.x * (radius + 76),
      y: from.y - tangent.y * 88 + outward.y * (radius + 76),
    };
    const controlTwo = {
      x: from.x + tangent.x * 88 + outward.x * (radius + 76),
      y: from.y + tangent.y * 88 + outward.y * (radius + 76),
    };

    return {
      path: `M ${start.x} ${start.y} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${end.x} ${end.y}`,
      labelX: from.x + outward.x * (radius + config.selfLoopLabelDistance),
      labelY: from.y + outward.y * (radius + config.selfLoopLabelDistance) + 7,
    };
  }

  const fromRadius = nodeRadius(from, config);
  const toRadius = nodeRadius(to, config);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
  const ux = dx / length;
  const uy = dy / length;
  const sx = from.x + ux * (fromRadius + 12);
  const sy = from.y + uy * (fromRadius + 12);
  const ex = to.x - ux * (toRadius + 14);
  const ey = to.y - uy * (toRadius + 14);
  const normal = { x: -uy, y: ux };
  const midpoint = { x: (sx + ex) / 2, y: (sy + ey) / 2 };
  const fromCenter = { x: midpoint.x - config.centerX, y: midpoint.y - config.centerY };
  const normalDot = normal.x * fromCenter.x + normal.y * fromCenter.y;
  const longEdge = length > 315;
  const routeSide = reciprocal ? 1 : longEdge && config.longRouteSide ? config.longRouteSide : normalDot >= 0 ? 1 : -1;
  const curve = reciprocal ? config.reciprocalCurve : longEdge ? config.longCurve : config.normalCurve;
  const mx = midpoint.x + normal.x * curve * routeSide;
  const my = midpoint.y + normal.y * curve * routeSide;
  const labelOffset = 18 * routeSide;

  return {
    path: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`,
    labelX: mx + normal.x * labelOffset,
    labelY: my + normal.y * labelOffset - 6,
  };
}

function automatonEdges(machine: AutomatonExample): GraphEdge[] {
  const groups = new Map<string, { from: string; to: string; labels: string[]; ids: string[] }>();

  Object.entries(machine.transitions).forEach(([from, bySymbol]) => {
    Object.entries(bySymbol).forEach(([symbol, destinations]) => {
      destinations.forEach((to) => {
        const key = `${from}->${to}`;
        const group = groups.get(key) ?? { from, to, labels: [], ids: [] };
        group.labels.push(symbol || EPSILON_DISPLAY);
        group.ids.push(`${from}->${to}:${symbol}`);
        groups.set(key, group);
      });
    });
  });

  return [...groups.values()].map((group) => ({
    id: group.ids.join("|"),
    from: group.from,
    to: group.to,
    label: group.labels.join(", "),
  }));
}

function pdaEdges(machine: PdaExample): GraphEdge[] {
  const groups = new Map<string, { from: string; to: string; labels: string[]; ids: string[] }>();

  machine.transitions.forEach((transition, index) => {
    const key = `${transition.from}->${transition.to}`;
    const group = groups.get(key) ?? {
      from: transition.from,
      to: transition.to,
      labels: [],
      ids: [],
    };

    group.labels.push(`T${index + 1}`);
    group.ids.push(transition.id);
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    id: group.ids.join("|"),
    from: group.from,
    to: group.to,
    label: group.labels.join(", "),
  }));
}

function pdaLegendItems(machine: PdaExample): PdaLegendItem[] {
  return machine.transitions.map((transition, index) => ({
    id: transition.id,
    number: index + 1,
    label: compactPdaLabel(transition.label),
  }));
}

function pdaInputAlphabet(machine: PdaExample) {
  return Array.from(
    new Set(
      machine.transitions
        .map((transition) => transition.read)
        .filter((symbol): symbol is string => Boolean(symbol)),
    ),
  ).sort();
}

function pdaAcceptanceLabel(mode: PdaExample["acceptanceMode"] = "final-state") {
  if (mode === "empty-stack") return "empty stack after input";
  if (mode === "both") return "final state and empty stack";
  return "final state after input";
}

function turingEdges(machine: TuringExample): GraphEdge[] {
  const groups = new Map<string, { from: string; to: string; labels: string[]; ids: string[] }>();

  machine.transitions.forEach((transition, index) => {
    const key = `${transition.from}->${transition.to}`;
    const group = groups.get(key) ?? {
      from: transition.from,
      to: transition.to,
      labels: [],
      ids: [],
    };

    group.labels.push(`T${index + 1}`);
    group.ids.push(transition.id);
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    id: group.ids.join("|"),
    from: group.from,
    to: group.to,
    label: group.labels.join(", "),
  }));
}

function turingLegendItems(machine: TuringExample): TuringLegendItem[] {
  return machine.transitions.map((transition, index) => ({
    id: transition.id,
    number: index + 1,
    from: transition.from,
    to: transition.to,
    label: compactTuringLabel(transition.label),
  }));
}

function turingInputAlphabet(machine: TuringExample) {
  return turingReadAlphabet(machine).filter((symbol) => symbol !== machine.blank);
}

function compactTuringLabel(label: string) {
  return label.replace(/\s*->\s*/g, " \u2192 ");
}

function groupedEdges(edges: GraphEdge[]): GraphEdge[] {
  const groups = new Map<string, { from: string; to: string; labels: string[]; ids: string[] }>();

  edges.forEach((edge) => {
    const key = `${edge.from}->${edge.to}`;
    const group = groups.get(key) ?? { from: edge.from, to: edge.to, labels: [], ids: [] };
    group.labels.push(edge.label);
    group.ids.push(edge.id);
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    id: group.ids.join("|"),
    from: group.from,
    to: group.to,
    label: group.labels.join(" / "),
  }));
}

export default App;
