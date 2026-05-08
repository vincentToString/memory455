import { ChevronDown, ChevronRight, Copy, FilePlus, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AutomatonExample } from "../types";
import {
  addAutomatonTransition,
  addStateToAutomaton,
  type AutomatonValidation,
  defaultTransitionDraft,
  EPSILON_LABEL,
  nextStateId,
  normalizeStateId,
  removeAutomatonTransition,
  removeStateFromAutomaton,
  setStartState,
  toggleAcceptState,
  transitionRows,
  transitionSymbolOptions,
  updateAutomatonAlphabet,
  updateAutomatonKind,
} from "../lib/automatonEditor";

const classNames = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(" ");

type AutomatonBuilderProps = {
  machine: AutomatonExample;
  validation: AutomatonValidation;
  canDelete: boolean;
  canSave: boolean;
  isDirty: boolean;
  isSaved: boolean;
  onChange: (machine: AutomatonExample) => void;
  onNew: () => void;
  onReset: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onDelete: () => void;
};

export function AutomatonBuilder({
  machine,
  validation,
  canDelete,
  canSave,
  isDirty,
  isSaved,
  onChange,
  onNew,
  onReset,
  onSave,
  onSaveAs,
  onDelete,
}: AutomatonBuilderProps) {
  const [stateDraft, setStateDraft] = useState(nextStateId(machine.states));
  const [transitionDraft, setTransitionDraft] = useState(defaultTransitionDraft(machine));
  const [isCollapsed, setIsCollapsed] = useState(true);
  const rows = useMemo(() => transitionRows(machine), [machine]);
  const symbolOptions = transitionSymbolOptions(machine);
  const stateIdsKey = machine.states.map((state) => state.id).join("|");
  const alphabetKey = machine.alphabet.join("|");
  const normalizedStateDraft = normalizeStateId(stateDraft);
  const canAddState =
    normalizedStateDraft.length > 0 &&
    !machine.states.some((state) => state.id === normalizedStateDraft);
  const canAddTransition =
    machine.states.length > 0 &&
    symbolOptions.length > 0 &&
    Boolean(transitionDraft.from && transitionDraft.symbol && transitionDraft.to);

  useEffect(() => {
    setStateDraft(nextStateId(machine.states));
  }, [stateIdsKey]);

  useEffect(() => {
    setTransitionDraft((current) => {
      const fallback = defaultTransitionDraft(machine);
      const hasFrom = machine.states.some((state) => state.id === current.from);
      const hasTo = machine.states.some((state) => state.id === current.to);
      const hasSymbol = symbolOptions.includes(current.symbol);

      return {
        from: hasFrom ? current.from : fallback.from,
        symbol: hasSymbol ? current.symbol : fallback.symbol,
        to: hasTo ? current.to : fallback.to,
      };
    });
  }, [stateIdsKey, alphabetKey, machine.kind]);

  const commit = (nextMachine: AutomatonExample) => onChange(nextMachine);

  const handleAddState = () => {
    const nextMachine = addStateToAutomaton(machine, stateDraft);
    commit(nextMachine);
    setStateDraft(nextStateId(nextMachine.states));
  };

  const handleAddTransition = () => {
    const nextMachine = addAutomatonTransition(machine, transitionDraft);
    commit(nextMachine);
  };

  return (
    <section className="builder-panel" aria-label="Automaton builder">
      <div className="builder-heading">
        <div>
          <span className="builder-eyebrow">Editable DFA / NFA</span>
          <h2>Automaton Builder</h2>
        </div>
        <div className="builder-heading-actions">
          <div className="builder-stats" aria-label="Automaton counts">
            <span className={validation.isValid ? "valid" : "invalid"}>
              {validation.isValid ? "valid" : `${validation.errorCount} fixes`}
            </span>
            <span className={isDirty ? "dirty" : "saved"}>{isDirty ? "unsaved" : isSaved ? "saved" : "preset"}</span>
            <span>{machine.states.length} states</span>
            <span>{rows.length} transitions</span>
          </div>
          <button
            className="builder-collapse-button"
            type="button"
            aria-expanded={!isCollapsed}
            aria-controls="automaton-builder-body"
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            <span>{isCollapsed ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </div>

      <div
        id="automaton-builder-body"
        className={classNames("builder-collapsible-body", isCollapsed && "collapsed")}
      >
        <ValidationSummary validation={validation} />

        <div className="builder-grid">
        <div className="builder-card">
          <div className="builder-card-title">
            <h3>Machine</h3>
            <div className="builder-actions">
              <button className="text-command" type="button" onClick={onNew}>
                <FilePlus size={16} />
                <span>New</span>
              </button>
              <button className="text-command" type="button" onClick={onSave} disabled={!canSave}>
                <Save size={16} />
                <span>Save</span>
              </button>
              <button className="text-command" type="button" onClick={onSaveAs}>
                <Copy size={16} />
                <span>Save As</span>
              </button>
              <button className="text-command" type="button" onClick={onReset}>
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
              <button
                className="text-command danger"
                type="button"
                onClick={onDelete}
                disabled={!canDelete}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div className="builder-form two-column">
            <label>
              <span>Title</span>
              <input
                value={machine.title}
                onChange={(event) => commit({ ...machine, title: event.target.value })}
              />
            </label>

            <label>
              <span>Type</span>
              <select
                value={machine.kind}
                onChange={(event) =>
                  commit(updateAutomatonKind(machine, event.target.value as AutomatonExample["kind"]))
                }
              >
                <option value="DFA">DFA</option>
                <option value="NFA">NFA</option>
              </select>
            </label>

            <label className="wide-field">
              <span>Language</span>
              <input
                value={machine.language}
                onChange={(event) => commit({ ...machine, language: event.target.value })}
              />
            </label>

            <label className="wide-field">
              <span>Alphabet</span>
              <input
                value={machine.alphabet.join(", ")}
                onChange={(event) => commit(updateAutomatonAlphabet(machine, event.target.value))}
                spellCheck={false}
              />
            </label>
          </div>
        </div>

        <div className="builder-card">
          <div className="builder-card-title">
            <h3>States</h3>
          </div>

          <div className="add-row">
            <input
              value={stateDraft}
              onChange={(event) => setStateDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canAddState) handleAddState();
              }}
              spellCheck={false}
            />
            <button type="button" onClick={handleAddState} disabled={!canAddState} title="Add state">
              <Plus size={18} />
            </button>
          </div>

          <div className="state-editor-list">
            {machine.states.map((state) => (
              <div key={state.id} className="state-editor-row">
                <strong>{state.label}</strong>
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={Boolean(state.start)}
                    onChange={() => commit(setStartState(machine, state.id))}
                  />
                  <span>Start</span>
                </label>
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={Boolean(state.accept)}
                    onChange={() => commit(toggleAcceptState(machine, state.id))}
                  />
                  <span>Accept</span>
                </label>
                <button
                  className="icon-danger"
                  type="button"
                  title="Remove state"
                  onClick={() => commit(removeStateFromAutomaton(machine, state.id))}
                  disabled={machine.states.length <= 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="builder-card transition-card">
          <div className="builder-card-title">
            <h3>Transitions</h3>
          </div>

          <div className="transition-add-row">
            <label>
              <span>From</span>
              <select
                value={transitionDraft.from}
                onChange={(event) =>
                  setTransitionDraft((current) => ({ ...current, from: event.target.value }))
                }
              >
                {machine.states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Read</span>
              <select
                value={transitionDraft.symbol}
                onChange={(event) =>
                  setTransitionDraft((current) => ({ ...current, symbol: event.target.value }))
                }
              >
                {symbolOptions.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol === EPSILON_LABEL ? EPSILON_LABEL : symbol}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>To</span>
              <select
                value={transitionDraft.to}
                onChange={(event) =>
                  setTransitionDraft((current) => ({ ...current, to: event.target.value }))
                }
              >
                {machine.states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={handleAddTransition} disabled={!canAddTransition} title="Add transition">
              <Plus size={18} />
            </button>
          </div>

          <div className={classNames("transition-list", rows.length === 0 && "empty")}>
            {rows.length === 0 ? (
              <div className="empty-list-row">No transitions</div>
            ) : (
              rows.map((row) => (
                <div key={row.key} className="transition-row">
                  <span>{row.from}</span>
                  <strong>{row.symbolLabel}</strong>
                  <span>{row.to}</span>
                  <button
                    className="icon-danger"
                    type="button"
                    title="Remove transition"
                    onClick={() => commit(removeAutomatonTransition(machine, row))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

function ValidationSummary({ validation }: { validation: AutomatonValidation }) {
  if (validation.issues.length === 0) {
    return (
      <div className="validation-summary valid" role="status">
        <strong>Ready to trace</strong>
        <span>The current automaton is valid for the selected input.</span>
      </div>
    );
  }

  return (
    <div className="validation-summary invalid" role="status">
      <strong>{validation.errorCount > 0 ? "Needs fixes" : "Warnings"}</strong>
      <div className="validation-issues">
        {validation.issues.slice(0, 5).map((issue, index) => (
          <span key={`${issue.message}-${index}`} className={issue.severity}>
            {issue.message}
          </span>
        ))}
        {validation.issues.length > 5 && <span>{validation.issues.length - 5} more issues</span>}
      </div>
    </div>
  );
}
