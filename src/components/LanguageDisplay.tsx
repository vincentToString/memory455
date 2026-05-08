import type { ReactNode } from "react";

type LanguageDisplayProps = {
  language: string;
  alphabet?: string[];
};

type ParsedLanguage =
  | {
      kind: "word-condition";
      condition: string;
    }
  | {
      kind: "set-condition";
      pattern: string;
      condition: string;
    }
  | {
      kind: "raw";
      value: string;
    };

const parseLanguage = (language: string): ParsedLanguage => {
  const trimmed = language.trim();
  const wordCondition = trimmed.match(
    /^L\s*=\s*\{\s*w\s+(?:in|\u2208)\s+\{[^}]*\}\*\s*\|\s*(.+)\s*\}$/i,
  );
  if (wordCondition) return { kind: "word-condition", condition: wordCondition[1] };

  const setCondition = trimmed.match(/^L\s*=\s*\{\s*(.+?)\s*\|\s*(.+)\s*\}$/i);
  if (setCondition) {
    return {
      kind: "set-condition",
      pattern: setCondition[1],
      condition: setCondition[2],
    };
  }

  return { kind: "raw", value: trimmed };
};

export function FormattedMathText({ text }: { text: string }) {
  const normalized = text.replace(/>=/g, "\u2265").replace(/<=/g, "\u2264");
  const pieces = normalized.split(/(\^[A-Za-z0-9*]+)/g);

  return (
    <>
      {pieces.map((piece, index) => {
        if (piece.startsWith("^")) {
          return <sup key={`${piece}-${index}`}>{piece.slice(1)}</sup>;
        }
        return <span key={`${piece}-${index}`}>{piece}</span>;
      })}
    </>
  );
}

function SetShell({ children }: { children: ReactNode }) {
  return (
    <div className="language-expression">
      <span className="language-symbol">L</span>
      <span>=</span>
      <span className="language-brace">{"{"}</span>
      {children}
      <span className="language-brace">{"}"}</span>
    </div>
  );
}

export function LanguageDisplay({ language, alphabet = [] }: LanguageDisplayProps) {
  const parsed = parseLanguage(language);

  if (parsed.kind === "raw") {
    return (
      <div className="language-display">
        <div className="language-expression raw">
          <FormattedMathText text={parsed.value} />
        </div>
        {alphabet.length > 0 && <AlphabetDisplay alphabet={alphabet} />}
      </div>
    );
  }

  return (
    <div className="language-display">
      {parsed.kind === "word-condition" ? (
        <SetShell>
          <span>w</span>
          <span className="math-relation">{"\u2208"}</span>
          <span>
            {"\u03A3"}
            <sup>*</sup>
          </span>
          <span className="language-divider">|</span>
          <span className="language-condition">
            <FormattedMathText text={parsed.condition} />
          </span>
        </SetShell>
      ) : (
        <SetShell>
          <span className="language-pattern">
            <FormattedMathText text={parsed.pattern} />
          </span>
          <span className="language-divider">|</span>
          <span className="language-condition">
            <FormattedMathText text={parsed.condition} />
          </span>
        </SetShell>
      )}
      {alphabet.length > 0 && <AlphabetDisplay alphabet={alphabet} />}
    </div>
  );
}

function AlphabetDisplay({ alphabet }: { alphabet: string[] }) {
  return (
    <div className="language-alphabet" aria-label="Alphabet">
      <span>{"\u03A3"}</span>
      <span>=</span>
      <span>{"{"}</span>
      {alphabet.map((symbol, index) => (
        <span key={symbol} className="alphabet-symbol">
          {symbol}
          {index < alphabet.length - 1 && <span className="alphabet-comma">,</span>}
        </span>
      ))}
      <span>{"}"}</span>
    </div>
  );
}
