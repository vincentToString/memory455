# Memory455

Memory455 is a small React demo app for tracing core COMP 455 ideas as "memory diagrams" for computation.

The first scope is intentionally focused:

- DFA/NFA traceboard with active state sets and consumed input
- Browser-local DFA/NFA builder with validation and saved custom machines
- PDA traceboard with visible input and stack
- Turing machine traceboard with visible tape and head position

The goal is not to replace full tools like JFLAP. It is a lightweight classroom companion for showing the hidden configuration at each step of a computation.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
