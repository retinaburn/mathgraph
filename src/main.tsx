import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Term = {
  id: string;
  coefficient: number;
  power: number;
};

type Preset = {
  id: string;
  name: string;
  variable: string;
  output: string;
  terms: Term[];
  input: string;
  note: string;
};

type Point = {
  x: number;
  y: number;
};

type DraftValues = Record<string, Partial<Record<"coefficient" | "power", string>>>;
type NonEmptyArray<T> = [T, ...T[]];

type SymbolInputProps = {
  label: string;
  fallback: string;
  value: string;
  onChange: (value: string) => void;
};

const presets: NonEmptyArray<Preset> = [
  {
    id: "quadratic",
    name: "Quadratic",
    variable: "x",
    output: "y",
    terms: [
      { id: "quad-a", coefficient: 1, power: 2 },
      { id: "quad-b", coefficient: 2, power: 1 },
      { id: "quad-c", coefficient: -3, power: 0 },
    ],
    input: "from -6 to 6 by 1",
    note: "A parabola changes direction, so the same output can come from different inputs.",
  },
  {
    id: "linear",
    name: "Linear",
    variable: "x",
    output: "y",
    terms: [
      { id: "line-a", coefficient: 2, power: 1 },
      { id: "line-b", coefficient: 1, power: 0 },
    ],
    input: "from -5 to 5 by 1",
    note: "A line grows by the same amount each time the input steps forward.",
  },
  {
    id: "square-area",
    name: "Square Area",
    variable: "s",
    output: "A",
    terms: [{ id: "square-a", coefficient: 1, power: 2 }],
    input: "1, 2, 3, 4, 5, 6, 7, 8",
    note: "The area of a square is a function of its side length.",
  },
  {
    id: "cube-volume",
    name: "Cube Volume",
    variable: "s",
    output: "V",
    terms: [{ id: "cube-a", coefficient: 1, power: 3 }],
    input: "1, 2, 3, 4, 5, 6",
    note: "Volume grows much faster than side length because the side is used three times.",
  },
  {
    id: "constant",
    name: "Constant",
    variable: "x",
    output: "y",
    terms: [{ id: "const-a", coefficient: 4, power: 0 }],
    input: "from -4 to 4 by 1",
    note: "Every input maps to the same output, which still counts as a function.",
  },
];

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
});

function cloneTerms(terms: Term[]) {
  return terms.map((term) => ({ ...term }));
}

function evaluate(terms: Term[], x: number) {
  return terms.reduce((total, term) => total + term.coefficient * x ** term.power, 0);
}

function parseInputSet(input: string) {
  const trimmed = input.trim().toLowerCase();
  const rangeMatch = trimmed.match(
    /^from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)\s+by\s+(\d+(?:\.\d+)?)$/,
  );

  if (rangeMatch) {
    const startText = rangeMatch[1];
    const endText = rangeMatch[2];
    const stepText = rangeMatch[3];

    if (!startText || !endText || !stepText) {
      return { values: [], error: "Use a range like from -6 to 6 by 1." };
    }

    const start = Number(startText);
    const end = Number(endText);
    const step = Number(stepText);

    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(step) || step <= 0) {
      return { values: [], error: "Use a positive step, like from -6 to 6 by 1." };
    }

    const direction = start <= end ? 1 : -1;
    const signedStep = step * direction;
    const values: number[] = [];
    let current = start;
    let guard = 0;

    while ((direction > 0 ? current <= end : current >= end) && guard < 501) {
      values.push(roundNumber(current));
      current += signedStep;
      guard += 1;
    }

    if (guard >= 501) {
      return { values: [], error: "That range creates too many values. Try a larger step." };
    }

    return { values, error: "" };
  }

  const pieces = input
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length === 0) {
    return { values: [], error: "Enter values like -2, -1, 0, 1, 2." };
  }

  const values = pieces.map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    return { values: [], error: "Use numbers separated by commas, or a range like from -5 to 5 by 1." };
  }

  return { values: values.map(roundNumber), error: "" };
}

function roundNumber(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "undefined";
  }

  return numberFormat.format(roundNumber(value));
}

function renderExpression(terms: Term[], variable: string, output: string) {
  const activeTerms = terms.filter((term) => term.coefficient !== 0);

  if (activeTerms.length === 0) {
    return `${output} = 0`;
  }

  const pieces = activeTerms.map((term, index) => {
    const sign = term.coefficient < 0 ? "-" : "+";
    const absolute = Math.abs(term.coefficient);
    const coefficient = absolute === 1 && term.power > 0 ? "" : formatNumber(absolute);
    const variablePart = term.power === 0 ? null : <VariablePower variable={variable} power={term.power} />;
    const body = (
      <>
        {coefficient}
        {variablePart}
      </>
    );

    if (index === 0) {
      return (
        <span key={term.id} className="expression-term">
          {sign === "-" ? "-" : ""}
          {body}
        </span>
      );
    }

    return (
      <span key={term.id} className="expression-term">
        <span className="expression-sign">{sign}</span>
        {body}
      </span>
    );
  });

  return (
    <>
      {output} = {pieces}
    </>
  );
}

function VariablePower({ variable, power }: { variable: string; power: number }) {
  return (
    <span className="variable-power">
      {variable}
      {power !== 1 ? <sup>{formatNumber(power)}</sup> : null}
    </span>
  );
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `term-${Date.now()}-${Math.random()}`;
}

function normalizeSymbol(value: string, fallback: string) {
  return value.trim().at(0) ?? fallback;
}

function SymbolInput({ label, fallback, value, onChange }: SymbolInputProps) {
  function replaceSymbol(rawValue: string) {
    onChange(normalizeSymbol(rawValue, fallback));
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        maxLength={1}
        onChange={(event) => replaceSymbol(event.target.value)}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) {
            return;
          }

          event.preventDefault();
          replaceSymbol(event.key);
        }}
      />
    </label>
  );
}

function App() {
  const [selectedPreset, setSelectedPreset] = useState(presets[0].id);
  const [variable, setVariable] = useState(presets[0].variable);
  const [output, setOutput] = useState(presets[0].output);
  const [terms, setTerms] = useState<Term[]>(() => cloneTerms(presets[0].terms));
  const [draftValues, setDraftValues] = useState<DraftValues>({});
  const [inputSet, setInputSet] = useState(presets[0].input);
  const activePreset = presets.find((preset) => preset.id === selectedPreset) ?? presets[0];

  const parsed = useMemo(() => parseInputSet(inputSet), [inputSet]);
  const points = useMemo<Point[]>(
    () => parsed.values.map((x) => ({ x, y: evaluate(terms, x) })),
    [parsed.values, terms],
  );
  const expression = useMemo(() => renderExpression(terms, variable, output), [terms, variable, output]);

  function applyPreset(presetId: string) {
    const preset = presets.find((item) => item.id === presetId) ?? presets[0];
    setSelectedPreset(preset.id);
    setVariable(preset.variable);
    setOutput(preset.output);
    setTerms(cloneTerms(preset.terms));
    setDraftValues({});
    setInputSet(preset.input);
  }

  function updateTerm(id: string, key: "coefficient" | "power", rawValue: string) {
    setDraftValues((currentDrafts) => ({
      ...currentDrafts,
      [id]: {
        ...currentDrafts[id],
        [key]: rawValue,
      },
    }));

    const trimmed = rawValue.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
      return;
    }

    const parsedValue = Number(trimmed);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const nextValue = key === "power" ? Math.max(0, Math.round(parsedValue)) : parsedValue;
    setTerms((currentTerms) =>
      currentTerms.map((term) => (term.id === id ? { ...term, [key]: nextValue } : term)),
    );
  }

  function addTerm() {
    const id = makeId();
    setTerms((currentTerms) => [
      ...currentTerms,
      { id, coefficient: 1, power: Math.max(0, currentTerms.length ? 1 : 0) },
    ]);
  }

  function removeTerm(id: string) {
    setTerms((currentTerms) => currentTerms.filter((term) => term.id !== id));
    setDraftValues((currentDrafts) => {
      const remainingDrafts = { ...currentDrafts };
      delete remainingDrafts[id];
      return remainingDrafts;
    });
  }

  function getDraftValue(term: Term, key: "coefficient" | "power") {
    return draftValues[term.id]?.[key] ?? String(term[key]);
  }

  return (
    <main className="app">
      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Function Lab</p>
          <h1 id="page-title">Build a rule. Choose inputs. Watch the output set appear.</h1>
        </div>
        <p>
          A function is more than one answer. It is a rule that maps every selected input to a
          matching output.
        </p>
      </section>

      <section className="workbench" aria-label="Function workbench">
        <div className="builder-panel">
          <div className="section-heading">
            <p className="eyebrow">1. Rule</p>
            <h2>{expression}</h2>
          </div>

          <label className="field">
            <span>Starting point</span>
            <select value={selectedPreset} onChange={(event) => applyPreset(event.target.value)}>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>

          <div className="symbol-grid">
            <SymbolInput label="Input symbol" value={variable} fallback="x" onChange={setVariable} />
            <SymbolInput label="Output symbol" value={output} fallback="y" onChange={setOutput} />
          </div>

          <div className="terms" aria-label="Polynomial terms">
            {terms.map((term) => (
              <div className="term-row" key={term.id}>
                <label>
                  <span>coefficient</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={getDraftValue(term, "coefficient")}
                    placeholder={formatNumber(term.coefficient)}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => updateTerm(term.id, "coefficient", event.target.value)}
                  />
                </label>
                <span className="term-var">{variable}</span>
                <label className="power-field">
                  <span>power</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getDraftValue(term, "power")}
                    placeholder={formatNumber(term.power)}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => updateTerm(term.id, "power", event.target.value)}
                  />
                </label>
                <button className="icon-button" type="button" onClick={() => removeTerm(term.id)} aria-label="Remove term">
                  ×
                </button>
              </div>
            ))}
          </div>

          <button className="secondary-button" type="button" onClick={addTerm}>
            Add term
          </button>
        </div>

        <div className="graph-panel">
          <div className="section-heading">
            <p className="eyebrow">2. Graph</p>
            <h2>Points from your input set</h2>
          </div>
          <FunctionGraph terms={terms} points={points} variable={variable} output={output} />
        </div>
      </section>

      <section className="sets-layout" aria-label="Input and output sets">
        <div className="set-editor">
          <div className="section-heading">
            <p className="eyebrow">3. Input Set</p>
            <h2>Choose the values the rule will use</h2>
          </div>
          <label className="field">
            <span>{variable} values</span>
            <textarea
              value={inputSet}
              onChange={(event) => setInputSet(event.target.value)}
              spellCheck={false}
              rows={4}
            />
          </label>
          <p className={parsed.error ? "hint error" : "hint"}>
            {parsed.error || "Try comma-separated values or a range like from -10 to 10 by 0.5."}
          </p>
        </div>

        <div className="mapping-panel">
          <div className="section-heading">
            <p className="eyebrow">4. Output Set</p>
            <h2>Each input gets exactly one output</h2>
          </div>
          <div className="set-summary">
            <SetPill label={`${variable} set`} values={parsed.values} />
            <SetPill label={`${output} set`} values={points.map((point) => point.y)} />
          </div>
          <MappingTable points={points} variable={variable} output={output} />
        </div>
      </section>

      <section className="lesson-strip">
        <div>
          <p className="eyebrow">Think About It</p>
          <p>{activePreset.note}</p>
        </div>
        <div>
          <p className="eyebrow">Ordered Pairs</p>
          <p>
            The graph plots each pair as ({variable}, {output}). Change the input set and the
            plotted points change with it.
          </p>
        </div>
      </section>
    </main>
  );
}

function SetPill({ label, values }: { label: string; values: number[] }) {
  const preview = values.slice(0, 9).map(formatNumber).join(", ");
  const ending = values.length > 9 ? ", ..." : "";

  return (
    <div className="set-pill">
      <strong>{label}</strong>
      <span>{values.length ? `{ ${preview}${ending} }` : "{ }"}</span>
    </div>
  );
}

function MappingTable({ points, variable, output }: { points: Point[]; variable: string; output: string }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{variable}</th>
            <th>{output}</th>
            <th>Point</th>
          </tr>
        </thead>
        <tbody>
          {points.length ? (
            points.map((point, index) => (
              <tr key={`${point.x}-${index}`}>
                <td>{formatNumber(point.x)}</td>
                <td>{formatNumber(point.y)}</td>
                <td>
                  ({formatNumber(point.x)}, {formatNumber(point.y)})
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>Add inputs to see the mapping.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FunctionGraph({
  terms,
  points,
  variable,
  output,
}: {
  terms: Term[];
  points: Point[];
  variable: string;
  output: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let animationFrame = 0;

    const render = () => {
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(bounds.width * dpr);
      canvas.height = Math.floor(bounds.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawGraph(context, bounds.width, bounds.height, terms, points, variable, output);
    };

    const queueRender = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(queueRender);
    observer.observe(canvas);
    queueRender();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [terms, points, variable, output]);

  return (
    <div className="graph-surface">
      <canvas ref={canvasRef} aria-label="Function graph" />
    </div>
  );
}

function drawGraph(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  terms: Term[],
  points: Point[],
  variable: string,
  output: string,
) {
  const padding = { top: 34, right: 28, bottom: 46, left: 58 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const finitePoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const xValues = finitePoints.map((point) => point.x);
  const xMin = Math.min(-5, ...xValues);
  const xMax = Math.max(5, ...xValues);
  const xSpan = Math.max(1, xMax - xMin);
  const curveStart = xMin - xSpan * 0.08;
  const curveEnd = xMax + xSpan * 0.08;
  const curve: Point[] = Array.from({ length: 180 }, (_, index) => {
    const x = curveStart + ((curveEnd - curveStart) * index) / 179;
    return { x, y: evaluate(terms, x) };
  }).filter((point) => Number.isFinite(point.y));
  const allY = [...finitePoints, ...curve].map((point) => point.y);
  const rawYMin = Math.min(-5, ...allY);
  const rawYMax = Math.max(5, ...allY);
  const ySpan = Math.max(1, rawYMax - rawYMin);
  const yMin = rawYMin - ySpan * 0.12;
  const yMax = rawYMax + ySpan * 0.12;

  const toCanvasX = (x: number) => padding.left + ((x - curveStart) / (curveEnd - curveStart)) * graphWidth;
  const toCanvasY = (y: number) => padding.top + ((yMax - y) / (yMax - yMin)) * graphHeight;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, width, height);

  drawGrid(context, padding, graphWidth, graphHeight, curveStart, curveEnd, yMin, yMax, toCanvasX, toCanvasY);

  context.strokeStyle = "#0d4f59";
  context.lineWidth = 3;
  context.beginPath();
  curve.forEach((point, index) => {
    const x = toCanvasX(point.x);
    const y = toCanvasY(point.y);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  if (curve.length) {
    context.stroke();
  }

  finitePoints.forEach((point) => {
    const x = toCanvasX(point.x);
    const y = toCanvasY(point.y);
    context.fillStyle = "#f25f4c";
    context.strokeStyle = "#2f2a26";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  context.fillStyle = "#2f2a26";
  context.font = "700 14px system-ui, sans-serif";
  context.fillText(variable, width - 24, toCanvasY(0) - 8);
  context.fillText(output, toCanvasX(0) + 8, 22);
}

function drawGrid(
  context: CanvasRenderingContext2D,
  padding: { top: number; right: number; bottom: number; left: number },
  graphWidth: number,
  graphHeight: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  toCanvasX: (value: number) => number,
  toCanvasY: (value: number) => number,
) {
  context.strokeStyle = "#eadfcb";
  context.lineWidth = 1;

  const xTicks = niceTicks(xMin, xMax, 7);
  const yTicks = niceTicks(yMin, yMax, 6);

  xTicks.forEach((tick) => {
    const x = toCanvasX(tick);
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, padding.top + graphHeight);
    context.stroke();
  });

  yTicks.forEach((tick) => {
    const y = toCanvasY(tick);
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + graphWidth, y);
    context.stroke();
  });

  context.strokeStyle = "#2f2a26";
  context.lineWidth = 2;
  if (xMin <= 0 && xMax >= 0) {
    const x = toCanvasX(0);
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, padding.top + graphHeight);
    context.stroke();
  }

  if (yMin <= 0 && yMax >= 0) {
    const y = toCanvasY(0);
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + graphWidth, y);
    context.stroke();
  }

  context.fillStyle = "#5f574f";
  context.font = "12px system-ui, sans-serif";
  xTicks.forEach((tick) => {
    const x = toCanvasX(tick);
    context.fillText(formatNumber(tick), x - 10, padding.top + graphHeight + 24);
  });
  yTicks.forEach((tick) => {
    const y = toCanvasY(tick);
    context.fillText(formatNumber(tick), 12, y + 4);
  });
}

function niceTicks(min: number, max: number, count: number) {
  const span = Math.max(1, max - min);
  const rawStep = span / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const niceResidual = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
  const step = niceResidual * magnitude;
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];

  for (let value = first; value <= max; value += step) {
    ticks.push(roundNumber(value));
  }

  return ticks;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
