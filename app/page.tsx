'use client';
import Link from "next/link";
import { ArrowRight, Grid, Lightbulb, Pencil } from "lucide-react";

const features = [
  {
    title: "Flexible grids",
    description:
      "Define board dimensions that match your puzzle vision, from compact teasers to sprawling canvases.",
    icon: Grid,
  },
  {
    title: "Targeted clues",
    description:
      "Pair every word with a numbered clue and hint so solvers always know where to focus next.",
    icon: Lightbulb,
  },
  {
    title: "Precise control",
    description:
      "Disable cells, manage conflicting letters, and fine-tune every placement before publishing.",
    icon: Pencil,
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Word Grid Studio
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
          Build smarter word puzzles with a guided admin workspace.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Start by shaping your board, deactivate unused cells, then layer in numbered clues with
          letter-perfect placement. Everything lives in one focused flow so you can concentrate on
          crafting delightful challenges.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Open the game builder
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#builder-overview"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            See what's included
          </a>
        </div>
      </section>
      <section id="builder-overview" className="space-y-6">
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          Admin tools designed for thoughtful puzzle design
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <Icon className="h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
