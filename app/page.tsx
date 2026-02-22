import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  ChatIcon,
  CheckIcon,
  HospitalIcon,
  IntakeIcon,
  ReferralIcon,
  SparklesIcon,
} from "@/components/ui-icons";

const highlights = [
  "Structured intake with red-flag triage",
  "Actionable care guidance, not vague diagnosis chatter",
  "Nearest hospital discovery with directions",
  "Doctor-ready referral notes in one click",
];

const features = [
  {
    title: "Structured intake",
    desc: "Age, red flags, symptom timeline, vitals, conditions, meds, allergies.",
    icon: IntakeIcon,
  },
  {
    title: "Triage-aware chat",
    desc: "Persistent urgency context and follow-up prompts to reduce missed details.",
    icon: ChatIcon,
  },
  {
    title: "Hospital discovery",
    desc: "Find nearby clinics with maps, directions, contact, and quick action links.",
    icon: HospitalIcon,
  },
  {
    title: "Referral notes",
    desc: "Generate clinical handoff summaries and export to PDF.",
    icon: ReferralIcon,
  },
] as const;

export default function LandingPage() {
  return (
    <main className="hero-grid min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-14 lg:px-10">
        <header className="mb-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-cyan-300" />
            <p className="text-xs tracking-[0.24em] text-cyan-200/90 uppercase">
              MaxWell Rural Care AI
            </p>
          </div>
          <SignedOut>
            <div className="flex items-center gap-3">
              <SignInButton>
                <button
                  className="micro-lift rounded-full border border-cyan-200/35 px-4 py-2 text-sm soft-focus-ring hover:border-cyan-200/60"
                  type="button"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button
                  className="micro-lift rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 soft-focus-ring hover:bg-cyan-200"
                  type="button"
                >
                  Create account
                </button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <Link
              href="/intake"
              className="micro-lift rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 soft-focus-ring hover:bg-cyan-200"
            >
              Continue to app
            </Link>
          </SignedIn>
        </header>

        <section className="fade-up grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-200/10 px-4 py-1 text-xs tracking-wider text-cyan-100 uppercase">
              <SparklesIcon className="h-3.5 w-3.5" />
              Triage-first assistant for rural communities
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-semibold sm:text-5xl lg:text-6xl">
              Decide the next safest care step in minutes, not hours.
            </h1>
            <p className="max-w-2xl text-lg text-cyan-50/80">
              MaxWell turns symptoms into clear urgency guidance, nearby care
              options, and doctor-ready referral notes. Built for low-resource
              and distance-challenged settings.
            </p>
            <div className="flex flex-wrap gap-3">
              <SignedOut>
                <SignUpButton>
                  <button
                    className="micro-lift rounded-full bg-emerald-300 px-6 py-3 font-semibold text-slate-950 soft-focus-ring hover:bg-emerald-200"
                    type="button"
                  >
                    Try MaxWell
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/intake"
                  className="micro-lift rounded-full bg-emerald-300 px-6 py-3 font-semibold text-slate-950 soft-focus-ring hover:bg-emerald-200"
                >
                  Start intake
                </Link>
              </SignedIn>
              <a
                href="#features"
                className="micro-lift rounded-full border border-cyan-200/40 px-6 py-3 font-semibold text-cyan-100 soft-focus-ring hover:border-cyan-200/70"
              >
                Explore features
              </a>
            </div>
          </div>

          <div className="card-glass rounded-3xl p-6">
            <h2 className="mb-4 text-xl font-semibold">Built for action</h2>
            <ul className="space-y-3 text-sm text-cyan-50/80">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-red-200/30 bg-red-900/25 p-4 text-sm text-red-100/95">
              MaxWell is not a doctor. In emergencies, call local emergency
              services immediately.
            </div>
          </div>
        </section>

        <section id="features" className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="card-glass micro-lift rounded-2xl p-5"
              >
                <div className="mb-3 inline-flex rounded-full border border-cyan-200/30 bg-cyan-200/10 p-2">
                  <Icon className="h-4 w-4 text-cyan-100" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-cyan-50/80">{feature.desc}</p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
