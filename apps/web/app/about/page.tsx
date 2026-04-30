import { MarketingPageShell } from "@/components/marketing-page-shell";

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow="About Metrix"
      title="Coworking designed like premium infrastructure, not short-term overflow."
      intro="Metrix was built for people who need space to feel reliable from the first click to the first meeting. We focus on premium desks, private offices, and bookable meeting rooms that remove friction instead of adding another app to manage."
    >
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">What we believe</h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Great workspaces should be flexible without feeling temporary. Teams want fast booking,
            clear availability, polished interiors, and the confidence that the space will be ready when clients arrive.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-medium tracking-tight">What we operate</h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Hot desks, dedicated desks, private offices, meeting rooms, quiet focus areas, and shared lounges
            across locations built for freelancers, operators, and modern teams.
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
