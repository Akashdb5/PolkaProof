import Link from "next/link";
import dynamic from "next/dynamic";
import { EventCheckInStatus } from "@/components/EventCheckInStatus";
import {
  EVENTS_PAGE_SIZE,
  getPolkaProofMetrics,
  listEvents
} from "@/lib/events";

const EventsWalletPanel = dynamic(
  () =>
    import("@/components/EventsWalletPanel").then(
      (mod) => mod.EventsWalletPanel
    ),
  { ssr: false }
);

export const revalidate = 0;

type SearchParams = {
  page?: string;
  q?: string;
  tag?: string;
};

const tagFilters = ["Hackathon", "Meetup", "Community", "Workshop"];

const highlights = [
  {
    title: "Polkadot signatureVerify",
    body: "Sr25519 / Ed25519 / ECDSA signatures from polkadot-js are verified server-side with @polkadot/util-crypto.",
    tag: "Polkadot"
  },
  {
    title: "Supabase + RLS",
    body: "Service-role keys gate organizer APIs while attendees stay in public RLS scopes—no custom chain needed.",
    tag: "Security"
  },
  {
    title: "QR ➝ Nonce ➝ signRaw",
    body: "Every check-in follows the Polkadot flow: scan QR, fetch nonce, call signRaw, and persist proofs off-chain.",
    tag: "Flow"
  }
];

function formatDate(value: string | null, fallback = "Date TBA") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

const numberFormatter = new Intl.NumberFormat("en-US");
function formatNumber(value: number) {
  return numberFormatter.format(value ?? 0);
}

function buildQuery(
  base: SearchParams,
  overrides: Record<string, string | number | undefined>
) {
  const params = new URLSearchParams();
  Object.entries({ ...base, ...overrides }).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === null) return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

export default async function HomePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const query = searchParams.q?.trim() ?? "";
  const tag = searchParams.tag?.trim() ?? "";

  const [{ events, total }, metrics] = await Promise.all([
    listEvents({ page, query, tag }),
    getPolkaProofMetrics()
  ]);
  const totalPages = Math.max(1, Math.ceil(total / EVENTS_PAGE_SIZE));
  const metricCards = [
    { label: "Verified check-ins", value: metrics.checkins },
    { label: "Polkadot wallets engaged", value: metrics.attendees },
    {
      label: "Communities hosted",
      value: metrics.organizers || metrics.events
    }
  ];

  return (
    <div className="space-y-12">
      <section className="card grid gap-10 p-10 md:grid-cols-[2fr,1fr]" id="hero">
        <div className="space-y-6">
          <span className="pill bg-white/10 text-xs font-semibold uppercase tracking-widest text-white">
            Powered by Polkadot
          </span>
          <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
            Host Devpost-like hackathons with Polkadot-native proofs.
          </h1>
          <p className="text-lg text-slate-300">
            Polkadot wallets sign every check-in. Supabase stores proofs, streaks, and
            leaderboards. QR to signature to badge in seconds.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#events"
              className="rounded-full bg-polka-pink px-6 py-3 text-sm font-semibold uppercase tracking-widest"
            >
              Explore events
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white"
            >
              How it works
            </a>
            <Link
              href="/profile"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white"
            >
              Manage profile
            </Link>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-widest text-slate-400">Live Polkadot metrics</p>
          <div className="space-y-4">
            {metricCards.map((metric) => (
              <div key={metric.label}>
                <p className="text-4xl font-bold text-white">
                  {formatNumber(metric.value)}
                </p>
                <p className="text-sm text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]" id="events">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Events</p>
              <h2 className="text-2xl font-semibold text-white">
                Upcoming check-ins ({formatNumber(metrics.events)} live)
              </h2>
            </div>
            <Link href="#organizers" className="text-sm text-polka-pink hover:underline">
              Submit your event
            </Link>
          </div>
          <form
            method="get"
            className="card flex flex-col gap-4 p-4 text-sm text-slate-300 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label className="text-xs uppercase tracking-widest">Search</label>
              <input
                type="text"
                name="q"
                defaultValue={query}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                placeholder="Search by title"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest">Tag</label>
              <select
                name="tag"
                defaultValue={tag}
                className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                <option value="">All</option>
                {tagFilters.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-polka-pink px-5 py-2 font-semibold uppercase tracking-widest"
              >
                Apply
              </button>
              <a
                href="/"
                className="rounded-full border border-white/20 px-5 py-2 text-white"
              >
                Reset
              </a>
            </div>
          </form>
          <EventsWalletPanel />
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="card p-8 text-center text-slate-400">
                <p>No events yet. Use the organizer API to seed your first campaign.</p>
              </div>
            ) : (
              events.map((event) => (
                <article
                  key={event.id}
                  className="card flex flex-col gap-4 border-white/10 p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
                      <span>{event.location ?? "Location TBA"}</span>
                      <span className="text-white/30">|</span>
                      <span>{formatDate(event.start_at)}</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white">{event.title}</h3>
                    <p className="text-sm text-slate-400">
                      RSVP to receive the Polkadot QR + signRaw prompt on-site.
                    </p>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Deadline: {formatDate(event.deadline, "Deadline TBA")}
                    </p>
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((t) => (
                          <a
                            key={t}
                            href={buildQuery({ ...searchParams, page: "1" }, { tag: t })}
                            className="pill text-[10px] uppercase tracking-widest"
                          >
                            {t}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2 md:items-end">
                    <Link
                      href={`/events/${event.id}/checkin`}
                      className="rounded-full border border-polka-pink px-6 py-3 text-center text-sm font-semibold uppercase tracking-widest text-white hover:bg-polka-pink md:w-auto"
                    >
                      Check-in flow
                    </Link>
                    <EventCheckInStatus eventId={event.id} />
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {page} of {totalPages} ({total} events)
            </span>
            <div className="flex gap-3">
              <a
                className={`rounded-full border px-4 py-2 ${
                  page <= 1 ? "cursor-not-allowed border-white/10 text-slate-600" : "border-white/30 text-white"
                }`}
                aria-disabled={page <= 1}
                href={page <= 1 ? "#" : buildQuery(searchParams, { page: page - 1 })}
              >
                Previous
              </a>
              <a
                className={`rounded-full border px-4 py-2 ${
                  page >= totalPages
                    ? "cursor-not-allowed border-white/10 text-slate-600"
                    : "border-white/30 text-white"
                }`}
                aria-disabled={page >= totalPages}
                href={page >= totalPages ? "#" : buildQuery(searchParams, { page: page + 1 })}
              >
                Next
              </a>
            </div>
          </div>
        </div>
        <aside className="card space-y-6 p-6" id="how-it-works">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Why PolkaProof</p>
            <h3 className="text-xl font-semibold text-white">Cloud-first, dev friendly</h3>
          </div>
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item.title} className="rounded-xl border border-white/5 bg-white/5 p-4">
                <span className="pill text-[10px] uppercase tracking-widest">{item.tag}</span>
                <p className="mt-2 text-base font-semibold text-white">{item.title}</p>
                <p className="text-sm text-slate-400">{item.body}</p>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p>
              Need custom flows? Compose Next.js routes that call polkadot-js signers, verify with
              `@polkadot/util-crypto`, and fan out to Supabase Functions or Redis caches.
            </p>
          </div>
        </aside>
      </section>

      <section id="organizers" className="card grid gap-6 p-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Organizers</p>
          <h3 className="text-3xl font-semibold text-white">
            Devpost-grade submission flows baked in.
          </h3>
          <p className="text-slate-300">
            Build event hubs, publish challenges, and issue custom badge art. PolkaProof mirrors
            Devpost UX with Polkadot wallets as the identity layer.
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>- Custom landing pages and QR assets per event.</li>
            <li>- One-click exports for attendance and prize eligibility.</li>
            <li>- Leaderboards cached via Redis for sub-second refresh.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-polka-pink/50 bg-slate-900/80 p-6 text-sm">
          <p className="text-white">Get started</p>
          <ol className="mt-4 space-y-3 text-slate-300">
            <li>1. Deploy Supabase schema (supabase/migrations/0001_initial.sql).</li>
            <li>2. Configure .env.local with Supabase keys.</li>
            <li>3. Hit POST /api/event with your service key + organizer API key.</li>
            <li>4. Print QR codes pointing to /events/[event_id]/checkin.</li>
          </ol>
          <p className="mt-4 text-xs text-slate-500">
            Need inspiration? Mirror the Devpost 48h hackathon format with live leaderboards.
          </p>
        </div>
      </section>
    </div>
  );
}
