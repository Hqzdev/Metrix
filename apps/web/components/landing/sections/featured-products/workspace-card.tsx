import Link from "next/link";
import { ArrowRight01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { WorkspaceProduct } from "./featured-products-data";

type WorkspaceCardProps = {
  index: number;
  workspace: WorkspaceProduct;
};

export function WorkspaceCard({ index, workspace }: WorkspaceCardProps) {
  return (
    <div
      data-reveal="scale"
      data-delay={String(index * 80)}
      className="group flex flex-col rounded-2xl border border-zinc-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-700/50 dark:bg-zinc-800/80"
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${workspace.iconBgClass}`}
        >
          <HugeiconsIcon
            icon={workspace.icon}
            size={24}
            strokeWidth={1.75}
            color={workspace.color}
          />
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${workspace.labelClass}`}
        >
          {workspace.label}
        </span>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
          {workspace.title}
        </h3>
        <div className="flex shrink-0 items-baseline gap-0.5">
          <span className="text-lg font-bold text-zinc-900 dark:text-white">
            {workspace.price}
          </span>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            {workspace.period}
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {workspace.description}
      </p>

      <div className="my-5 border-t border-zinc-100 dark:border-zinc-700/50" />

      <ul className="flex flex-col gap-2.5">
        {workspace.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">
              <HugeiconsIcon
                icon={Tick01Icon}
                size={15}
                strokeWidth={2}
                color={workspace.tickColor}
              />
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <Link
          href={workspace.href}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-all ${workspace.ctaClass}`}
        >
          {workspace.cta}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={15}
            strokeWidth={2.5}
            color="currentColor"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  );
}
