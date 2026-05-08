import { ChevronDown, ChevronRight, FilePlus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TuringExample, TuringTransition } from "../types";
import {
  addTuringState,
  addTuringTransition,
  defaultTuringTransitionDraft,
  hasTuringReadConflict,
  nextTuringStateId,
  normalizeTuringStateId,
  normalizeTapeSymbol,
  removeTuringState,
  removeTuringTransition,
  setTuringStartState,
  toggleTuringAcceptState,
  toggleTuringRejectState,
  updateTuringBlank,
} from "../lib/turingEditor";

const classNames = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(" ");

type TuringBuilderProps = {
  machine: TuringExample;
  onChange: (machine: TuringExample) => void;
  onNew: () => void;
  onReset: () => void;
};

const moveOptions: TuringTransition["move"][] = ["L", "R", "S"];

export function TuringBuilder({ machine, onChange, onNew, onReset }: TuringBuilderProps) {
  const [stateDraft, setStateDraft] = useState(nextTuringStateId(machine.states));
  const [transitionDraft, setTransitionDraft] = useState(defaultTuringTransitionDraft(machine));
  const [isCollapsed, setIsCollapsed] = useState(true);
  const stateIdsKey = machine.states.map((state) => state.id).join("|");
  const normalizedStateDraft = normalizeTuringStateId(stateDraft);
  const readConflict = hasTuringReadConflict(machine, transitionDraft);
  const canAddState =
    normalizedStateDraft.length > 0 &&
    !machine.states.some((state) => state.id === normalizedStateDraft);
  const canAddTransition =
    machine.states.length > 0 &&
    Boolean(transitionDraft.from && transitionDraft.to) &&
    !readConflict;
  const stateOptions = useMemo(
    () =>
      machine.states.map((state) => (
        <option key={state.id} value={state.id}>
          {state.label}
        </option>
      )),
    [stateIdsKey],
  );

  useEffect(() => {
    setStateDraft(nextTuringStateId(machine.states));
  }, [stateIdsKey]);

  useEffect(() => {
    setTransitionDraft((current) => {
      const fallback = defaultTuringTransitionDraft(machine);
      const hasFrom = machine.states.some((state) => state.id === current.from);
      const hasTo = machine.states.some((state) => state.id === current.to);

      return {
        from: hasFrom ? current.from : fallback.from,
        read: current.read || fallback.read,
        write: current.write || fallback.write,
        move: current.move,
        to: hasTo ? current.to : fallback.to,
      };
    });
  }, [stateIdsKey, machine.blank]);

  const commit = (nextMachine: TuringExample) => onChange(nextMachine);

  const handleAddState = () => {
    const nextMachine = addTuringState(machine, stateDraft);
    commit(nextMachine);
    setStateDraft(nextTuringStateId(nextMachine.states));
  };

  const handleAddTransition = () => {
    commit(addTuringTransition(machine, transitionDraft));
  };

  return (
    <section className="builder-panel" aria-label="Turing machine builder">
      <div className="builder-heading">
        <div>
          <span className="builder-eyebrow">Editable Turing Machine</span>
          <h2>Machine Builder</h2>
        </div>
        <div className="builder-heading-actions">
          <div className="builder-stats" aria-label="Turing machine counts">
            <span>{machine.states.length} states</span>
            <span>{machine.transitions.length} rules</span>
            <span>{machine.acceptStates.length} halting accept</span>
            <span>{(machine.rejectStates ?? []).length} halting reject</span>
          </div>
          <button
            className="builder-collapse-button"
            type="button"
            aria-expanded={!isCollapsed}
            aria-controls="tm-builder-body"
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            <span>{isCollapsed ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </div>

      <div
        id="tm-builder-body"
        className={classNames("builder-collapsible-body", isCollapsed && "collapsed")}
      >
        <div className="builder-grid tm-builder-grid">
        <div className="builder-card">
          <div className="builder-card-title">
            <h3>Machine</h3>
            <div className="builder-actions">
              <button className="text-command" type="button" onClick={onNew}>
                <FilePlus size={16} />
                <span>New</span>
              </button>
              <button className="text-command" type="button" onClick={onReset}>
                <RotateCcw size={16} />
                <span>Reset</span>
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
              <span>Blank</span>
              <input
                value={machine.blank}
                onChange={(event) => commit(updateTuringBlank(machine, event.target.value))}
                spellCheck={false}
              />
            </label>

            <label className="wide-field">
              <span>Task</span>
              <input
                value={machine.task}
                onChange={(event) => commit({ ...machine, task: event.target.value })}
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
              <div key={state.id} className="state-editor-row tm-state-editor-row">
                <strong>{state.label}</strong>
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={machine.startState === state.id}
                    onChange={() => commit(setTuringStartState(machine, state.id))}
                  />
                  <span>Start</span>
                </label>
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={machine.acceptStates.includes(state.id)}
                    onChange={() => commit(toggleTuringAcceptState(machine, state.id))}
                  />
                  <span>Accept</span>
                </label>
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={(machine.rejectStates ?? []).includes(state.id)}
                    onChange={() => commit(toggleTuringRejectState(machine, state.id))}
                  />
                  <span>Reject</span>
                </label>
                <button
                  className="icon-danger"
                  type="button"
                  title="Remove state"
                  onClick={() => commit(removeTuringState(machine, state.id))}
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
            <h3>Transition Rules</h3>
            {readConflict && <span className="builder-warning">duplicate read rule</span>}
          </div>

          <div className="tm-transition-add-row">
            <label>
              <span>From</span>
              <select
                value={transitionDraft.from}
                onChange={(event) =>
                  setTransitionDraft((current) => ({ ...current, from: event.target.value }))
                }
              >
                {stateOptions}
              </select>
            </label>

            <label>
              <span>Read</span>
              <input
                value={transitionDraft.read}
                onChange={(event) =>
                  setTransitionDraft((current) => ({
                    ...current,
                    read: normalizeTapeSymbol(event.target.value, machine.blank),
                  }))
                }
                spellCheck={false}
              />
            </label>

            <label>
              <span>Write</span>
              <input
                value={transitionDraft.write}
                onChange={(event) =>
                  setTransitionDraft((current) => ({
                    ...current,
                    write: normalizeTapeSymbol(event.target.value, machine.blank),
                  }))
                }
                spellCheck={false}
              />
            </label>

            <label>
              <span>Move</span>
              <select
                value={transitionDraft.move}
                onChange={(event) =>
                  setTransitionDraft((current) => ({
                    ...current,
                    move: event.target.value as TuringTransition["move"],
                  }))
                }
              >
                {moveOptions.map((move) => (
                  <option key={move} value={move}>
                    {move}
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
                {stateOptions}
              </select>
            </label>

            <button type="button" onClick={handleAddTransition} disabled={!canAddTransition} title="Add rule">
              <Plus size={18} />
            </button>
          </div>

          <div className={classNames("transition-list", machine.transitions.length === 0 && "empty")}>
            {machine.transitions.length === 0 ? (
              <div className="empty-list-row">No transition rules</div>
            ) : (
              machine.transitions.map((transition) => (
                <div key={transition.id} className="tm-transition-row">
                  <span>{transition.from}</span>
                  <strong>{transition.label}</strong>
                  <span>{transition.to}</span>
                  <button
                    className="icon-danger"
                    type="button"
                    title="Remove rule"
                    onClick={() => commit(removeTuringTransition(machine, transition.id))}
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
