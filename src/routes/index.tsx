import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { tasks, toStep, type Step, type Task } from "@/lib/tasks";
import { buildSteps } from "@/lib/steps.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Schritt für Schritt – Ihr ruhiger Helfer" },
      {
        name: "description",
        content:
          "Eine ruhige Hilfe für den Alltag: Eine Aufgabe wählen und immer nur einen Schritt auf einmal sehen – groß, klar und ohne Stress.",
      },
      { property: "og:title", content: "Schritt für Schritt – Ihr ruhiger Helfer" },
      {
        property: "og:description",
        content: "Eine Aufgabe wählen und immer nur einen Schritt auf einmal sehen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [step, setStep] = useState(0);

  const start = (t: Task) => {
    setTask(t);
    setSteps(t.steps.map(toStep));
    setStep(0);
  };

  const reset = () => {
    setTask(null);
    setSteps([]);
    setStep(0);
  };

  // Bei "Nein" die Unterschritte direkt hinter dem aktuellen Schritt einschieben
  const addSubSteps = (subs: string[]) => {
    setSteps((prev) => [
      ...prev.slice(0, step + 1),
      ...subs.map((text) => ({ text, sub: true })),
      ...prev.slice(step + 1),
    ]);
    setStep((s) => s + 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b-2 border-border px-6 py-5">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <span className="font-display text-3xl font-semibold text-primary">
            Schritt für Schritt
          </span>
          {task && (
            <button
              onClick={reset}
              className="rounded-full bg-muted px-5 py-2 text-lg font-medium text-muted-foreground"
            >
              Von vorne
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-12">
        {!task ? (
          <TaskPicker onPick={start} />
        ) : step < steps.length ? (
          <StepView
            title={task.title}
            steps={steps}
            step={step}
            onDone={() => setStep((s) => s + 1)}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onNo={addSubSteps}
          />
        ) : (
          <FinishedView task={task} onReset={reset} />
        )}
      </main>
    </div>
  );
}


function TaskPicker({ onPick }: { onPick: (t: Task) => void }) {
  const build = useServerFn(buildSteps);
  const [wish, setWish] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = wish.trim();
    if (text.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const task = await build({ data: { wish: text } });
      onPick(task);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("KEIN_GUTHABEN")
          ? "Die Hilfe ist gerade nicht verfügbar. Bitte später noch einmal versuchen."
          : msg.includes("ZU_VIELE_ANFRAGEN")
            ? "Bitte warten Sie einen Moment und versuchen Sie es dann noch einmal."
            : "Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-10 text-center">
      <h1 className="font-display text-5xl font-semibold leading-tight text-balance">
        Was möchten Sie heute machen?
      </h1>
      <p className="max-w-md text-2xl leading-relaxed text-muted-foreground">
        Schreiben Sie es einfach hin. Wir gehen es dann ganz in Ruhe zusammen
        durch.
      </p>

      <form onSubmit={submit} className="flex w-full flex-col gap-4">
        <input
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          maxLength={120}
          disabled={loading}
          placeholder="Zum Beispiel: Wäsche waschen"
          className="w-full rounded-3xl bg-card px-8 py-7 text-3xl shadow-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading || wish.trim().length < 2}
          className="rounded-3xl bg-primary px-8 py-7 text-3xl font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep disabled:opacity-40"
        >
          {loading ? "Einen Moment …" : "Los geht’s"}
        </button>
      </form>

      {error && (
        <p className="max-w-md text-2xl leading-relaxed text-destructive">
          {error}
        </p>
      )}

      <p className="text-xl text-muted-foreground">Oder wählen Sie hier:</p>

      <div className="flex w-full flex-col gap-4">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="rounded-3xl bg-card px-8 py-7 text-left text-3xl font-semibold shadow-sm ring-1 ring-border transition-colors hover:bg-muted"
          >
            {t.title}
          </button>
        ))}
      </div>
    </div>
  );
}


function StepView({
  title,
  steps,
  step,
  onDone,
  onBack,
  onNo,
}: {
  title: string;
  steps: Step[];
  step: number;
  onDone: () => void;
  onBack: () => void;
  onNo: (subs: string[]) => void;
}) {
  const total = steps.length;
  const current = steps[step]!;
  const isSub = "sub" in current && (current as { sub?: boolean }).sub;
  const hasQuestion = Boolean(current.ask && current.ifNo?.length);

  return (
    <div className="flex w-full flex-1 flex-col gap-8">
      <div className="flex items-center justify-between text-xl text-muted-foreground">
        <span className="font-medium">
          {title} · Schritt {step + 1} von {total}
        </span>
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`size-4 rounded-full ${
                i < step
                  ? "bg-success"
                  : i === step
                    ? "bg-primary"
                    : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-3xl bg-card px-8 py-16 text-center shadow-sm ring-1 ring-border">
        {isSub && (
          <span className="rounded-full bg-muted px-5 py-2 text-xl font-medium text-muted-foreground">
            Kleiner Zwischenschritt
          </span>
        )}
        <p className="font-display text-5xl font-semibold leading-tight text-balance">
          {current.text}
        </p>
        {hasQuestion && (
          <p className="text-3xl leading-relaxed text-muted-foreground">
            {current.ask}
          </p>
        )}
      </div>

      {hasQuestion ? (
        <div className="flex flex-col gap-4">
          <button
            onClick={onDone}
            className="rounded-2xl bg-success px-8 py-6 text-3xl font-bold text-success-foreground shadow-sm transition-colors hover:bg-success-deep"
          >
            Ja, alles gut
          </button>
          <button
            onClick={() => onNo(current.ifNo!)}
            className="rounded-2xl bg-primary px-8 py-6 text-3xl font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep"
          >
            Nein, noch nicht
          </button>
          <button
            onClick={onBack}
            disabled={step === 0}
            className="rounded-2xl bg-muted px-8 py-4 text-2xl font-medium text-muted-foreground disabled:opacity-40"
          >
            Zurück
          </button>
        </div>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={onBack}
            disabled={step === 0}
            className="rounded-2xl bg-muted px-8 py-6 text-2xl font-medium text-muted-foreground disabled:opacity-40"
          >
            Zurück
          </button>
          <button
            onClick={onDone}
            className="flex-1 rounded-2xl bg-success px-8 py-6 text-3xl font-bold text-success-foreground shadow-sm transition-colors hover:bg-success-deep"
          >
            Fertig
          </button>
        </div>
      )}

      <p className="text-center text-lg text-muted-foreground">
        Nehmen Sie sich Zeit. Es gibt keinen Stress.
      </p>
    </div>
  );
}


function FinishedView({ task, onReset }: { task: Task; onReset: () => void }) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 text-center">
      <p className="font-display text-6xl font-semibold text-success">
        Geschafft!
      </p>
      <p className="max-w-md text-2xl leading-relaxed text-muted-foreground">
        Sie haben „{task.title}“ ganz allein geschafft. Gut gemacht!
      </p>
      <button
        onClick={onReset}
        className="rounded-2xl bg-primary px-10 py-6 text-3xl font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep"
      >
        Neue Aufgabe
      </button>
    </div>
  );
}
