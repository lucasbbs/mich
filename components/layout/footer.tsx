export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© {year} Word Grid Studio.</span>
        <span>Craft thoughtful word puzzles with purpose-built tooling.</span>
      </div>
    </footer>
  );
}
