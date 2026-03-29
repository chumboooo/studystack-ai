const features = [
  "Next.js App Router with TypeScript",
  "Tailwind CSS v4 with PostCSS",
  "Strict TypeScript configuration",
  "ESLint flat config for production workflows",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-6 py-20 sm:px-10">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            StudyStack AI
          </p>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Next.js, TypeScript, and Tailwind are ready to build on.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              This starter keeps the structure lean, typed, and ready for production work without
              baking in secrets or unnecessary boilerplate.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-slate-950/30"
            >
              <p className="text-sm font-medium text-slate-100">{feature}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
