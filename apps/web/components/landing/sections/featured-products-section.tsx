import { workspaces } from "./featured-products/featured-products-data";
import { WorkspaceCard } from "./featured-products/workspace-card";

export function FeaturedProductsSection() {
  return (
    <section id="product" className="bg-[#FAFAFA] dark:bg-zinc-950 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">

        <div data-reveal className="mb-14 text-center">
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-white md:text-5xl">
            What you can book
          </h2>
          <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
            Every workspace type, available on demand.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {workspaces.map((workspace, index) => (
            <WorkspaceCard
              key={workspace.title}
              index={index}
              workspace={workspace}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
