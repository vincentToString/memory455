import { ChevronDown, ChevronRight, FilePlus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PdaExample } from "../types";
import {
  addPdaState,
  addPdaTransition,
  defaultPdaTransitionDraft,
  nextPdaStateId,
  normalizePdaStateId,
  pdaTransitionDisplay,
  PDA_EPSILON_LABEL,
  removePdaState,
  removePdaTransition,
  setPdaStartState,
  togglePdaAcceptState,
  updatePdaAcceptanceMode,
  updatePdaStackBottomMarker,
  updatePdaStartStack,
} from "../lib/pdaEditor";

const classNames = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(" ");

type PdaBuilderProps = {
  machine: PdaExample;
  onChange: (machine: PdaExample) => void;
  onNew: () => void;
  onReset: () => void;
};

export function PdaBuilder({ machine, onChange, onNew, onReset }: PdaBuilderProps) {
  const [stateDraft, setStateDraft] = useState(nextPdaStateId(machine.states));
  const [transitionDraft, setTransitionDraft] = useState(defaultPdaTransitionDraft(machine));
  const [isCollapsed, setIsCollapsed] = useState(true);
  const stateIdsKey = machine.states.map((state) => state.id).join("|");
  const startStackKey = machine.startStack.join("|");
  const normalizedStateDraft = normalizePdaStateId(stateDraft);
  const transitionCount = machine.transitions.length;
  const canAddState =
    normalizedStateDraft.length > 0 &&
    !machine.states.some((state) => state.id === normalizedStateDraft);
  const canAddTransition =
    machine.states.length > 0 && Boolean(transitionDraft.from && transitionDraft.to);
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
    setStateDraft(nextPdaStateId(machine.states));
  }, [stateIdsKey]);

  useEffect(() => {
    setTransitionDraft((current) => {
      const fallback = defaultPdaTransitionDraft(machine);
      const hasFrom = machine.states.some((state) => state.id === current.from);
      const hasTo = machine.states.some((state) => state.id === current.to);

      return {
        from: hasFrom ? current.from : fallback.from,
        read: current.read || fallback.read,
        pop: current.pop || fallback.pop,
        push: current.push || fallback.push,
        to: hasTo ? current.to : fallback.to,
        requireInputEnd: current.requireInputEnd,
      };
    });
  }, [stateIdsKey, startStackKey]);

  const commit = (nextMachine: PdaExample) => onChange(nextMachine);

  const handleAddState = () => {
    const nextMachine = addPdaState(machine, stateDraft);
    commit(nextMachine);
    setStateDraft(nextPdaStateId(nextMachine.states));
  };

  const handleAddTransition = () => {
    commit(addPdaTransition(machine, transitionDraft));
  };

  return (
    <section className="builder-panel" aria-label="PDA builder">
      <div className="builder-heading">
        <div>
          <span className="builder-eyebrow">Editable PDA</span>
          <h2>Automaton Builder</h2>
        </div>
        <div className="builder-heading-actions">
          <div className="builder-stats" aria-label="PDA counts">
            <span>{machine.states.length} states</span>
            <span>{transitionCount} transitions</span>
            <span>{machine.acceptStates.length} accepting</span>
          </div>
          <button
            className="builder-collapse-button"
            type="button"
            aria-expanded={!isCollapsed}
            aria-controls="pda-builder-body"
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            <span>{isCollapsed ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </div>

      <div
        id="pda-builder-body"
        className={classNames("builder-collapsible-body", isCollapsed && "collapsed")}
      >
        <div className="builder-grid pda-builder-grid">
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
              <span>Acceptance</span>
              <select
                value={machine.acceptanceMode}
                onChange={(event) =>
                  commit(updatePdaAcceptanceMode(machine, event.target.value as PdaExample["acceptanceMode"]))
                }
              >
                <option value="final-state">Final state</option>
                <option value="empty-stack">Empty stack</option>
                <option value="both">Both</option>
              </select>
            </label>

            <label>
              <span>Bottom marker</span>
              <input
                value={machine.stackBottomMarker ?? ""}
                onChange={(event) => commit(updatePdaStackBottomMarker(machine, event.target.value))}
                placeholder="$"
                spellCheck={false}
              />
            </label>

            <label className="wide-field">
              <span>Initial stack</span>
              <input
                value={machine.startStack.join(", ")}
                onChange={(event) => commit(updatePdaStartStack(machine, event.target.value))}
                placeholder="$"
                spellCheck={false}
              />
            </label>

            <label className="wide-field">
              <span>Language</span>
              <input
                value={machine.language}
                onChange={(event) => commit({ ...machine, language: event.target.value })}
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
                    checked={machine.startState === state.id}
                    onChange={() => commit(setPdaStartState(machine, state.id))}
                  />
                  <span>Start</span>
                </label>
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={machine.acceptStates.includes(state.id)}
                    onChange={() => commit(togglePdaAcceptState(machine, state.id))}
                  />
                  <span>Accept</span>
                </label>
                <button
                  className="icon-danger"
                  type="button"
                  title="Remove state"
                  onClick={() => commit(removePdaState(machine, state.id))}
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

          <div className="pda-transition-add-row">
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
                  setTransitionDraft((current) => ({ ...current, read: event.target.value.trim() }))
                }
                placeholder={PDA_EPSILON_LABEL}
                spellCheck={false}
              />
            </label>

            <label>
              <span>Pop</span>
              <input
                value={transitionDraft.pop}
                onChange={(event) =>
                  setTransitionDraft((current) => ({ ...current, pop: event.target.value.trim() }))
                }
                placeholder={PDA_EPSILON_LABEL}
                spellCheck={false}
              />
            </label>

            <label>
              <span>Push</span>
              <input
                value={transitionDraft.push}
                onChange={(event) =>
                  setTransitionDraft((current) => ({ ...current, push: event.target.value.trim() }))
                }
                placeholder={PDA_EPSILON_LABEL}
                spellCheck={false}
              />
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

            <label className="check-control end-control">
              <input
                type="checkbox"
                checked={transitionDraft.requireInputEnd}
                onChange={(event) =>
                  setTransitionDraft((current) => ({
                    ...current,
                    requireInputEnd: event.target.checked,
                  }))
                }
              />
              <span>End</span>
            </label>

            <button type="button" onClick={handleAddTransition} disabled={!canAddTransition} title="Add transition">
              <Plus size={18} />
            </button>
          </div>

          <div className={classNames("transition-list", transitionCount === 0 && "empty")}>
            {transitionCount === 0 ? (
              <div className="empty-list-row">No transitions</div>
            ) : (
              machine.transitions.map((transition) => (
                <div key={transition.id} className="pda-transition-row">
                  <span>{transition.from}</span>
                  <strong>{pdaTransitionDisplay(transition)}</strong>
                  <span>{transition.to}</span>
                  <em>{transition.requireInputEnd ? "end" : ""}</em>
                  <button
                    className="icon-danger"
                    type="button"
                    title="Remove transition"
                    onClick={() => commit(removePdaTransition(machine, transition.id))}
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
