# Theory Audit Notes

This file records the theoretical review decisions for the automata traceboards.

| Issue | Verdict | Change |
| --- | --- | --- |
| PDA acceptance semantics | Partly valid. Acceptance by final state with consumed input is a standard PDA convention, but the UI did not say which convention was being used. | Added `acceptanceMode` to PDA machines with `final-state`, `empty-stack`, and `both` modes. The PDA panel and builder now show/edit the acceptance criterion. The `a^n b^n` preset remains final-state acceptance, so keeping `$` on the stack is intentional. |
| PDA determinism | Valid. The simulator follows the first matching transition, so it is deterministic rather than a full nondeterministic PDA search. | Labeled the module as a DPDA trace in the UI. Full nondeterministic branching/backtracking is recorded as future work rather than hidden behind the PDA label. |
| Turing Machine reject states | Valid. The TM model only had accepting states and no explicit rejecting halting states. | Added `rejectStates` to `TuringExample`, simulator status checks, builder controls, and graph styling for reject states. |
| DFA completeness validation | Valid as a pedagogical concern. Complete transition functions are formal DFA definitions, but partial classroom diagrams are common and useful. | Missing DFA transitions are now warnings, not errors. During simulation, a missing DFA transition implicitly rejects. Multiple transitions for a DFA symbol remain errors. |
| PDA bottom-of-stack marker | Valid. `$` was used by convention but not represented as a machine-level convention. | Added optional `stackBottomMarker` to PDA machines and builder controls. |
| Epsilon representation | Valid as a display consistency concern. Full internal unification would be a larger cross-model refactor because DFA/NFA currently use `""` and PDA transitions use `null`. | Standardized visible epsilon display to epsilon notation in the UI and labels. Internal representations remain model-specific for now. |
