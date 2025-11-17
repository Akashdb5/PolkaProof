import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getEventByIdentifier } from "@/lib/events";

type Props = {
  params: { id: string };
};

const CheckInForm = dynamic(
  () => import("@/components/CheckInForm").then((mod) => mod.CheckInForm),
  { ssr: false, loading: () => <p className="text-slate-400">Loading wallet flow...</p> }
);

const EventTabs = dynamic(
  () => import("@/components/EventTabs").then((mod) => mod.EventTabs),
  { ssr: false, loading: () => <p className="text-slate-400">Loading details...</p> }
);

export async function generateMetadata({ params }: Props) {
  const event = await getEventByIdentifier(params.id);
  return {
    title: event ? `${event.title} - Check-in | PolkaProof` : "Check-in | PolkaProof"
  };
}

export default async function EventCheckInPage({ params }: Props) {
  const event = await getEventByIdentifier(params.id);
  if (!event) {
    notFound();
  }

  const readableDate = event.start_at
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(event.start_at))
    : "Date TBA";

  const deadlineText = event.deadline
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(event.deadline))
    : "Deadline TBA";

  const overview = event.description;
  const rules =
    typeof event.metadata?.rules === "string"
      ? event.metadata.rules
      : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/" className="text-polka-pink hover:underline">
          Back to dashboard
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400">{event.slug ?? event.id}</span>
      </div>

      <section className="card p-8">
        <p className="text-xs uppercase tracking-widest text-slate-400">Event details</p>
        <h1 className="mt-2 text-4xl font-semibold text-white">{event.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
          <span className="pill bg-white/10 text-white">{readableDate}</span>
          <span className="pill bg-white/10 text-white">
            {event.location ?? "Location TBA"}
          </span>
          <span className="pill bg-white/10 text-white">Deadline: {deadlineText}</span>
        </div>
        {event.tags && event.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <span key={tag} className="pill text-[10px] uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="mt-6 max-w-2xl text-slate-300">
          Scan the QR at the venue, request a nonce, sign the canonical message, and submit the
          signature. Everything is verified via signatureVerify and stored in Supabase.
        </p>
      </section>

      <EventTabs overview={overview} rules={rules} />

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white">Check-in flow</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-300">
            <li>1. Connect a Polkadot wallet (Talisman, Subwallet, Polkadot.js).</li>
            <li>2. Fetch nonce + timestamp from the pre-sign API.</li>
            <li>3. Sign the canonical message in your wallet.</li>
            <li>4. Submit signature to the attendance API and receive your badge.</li>
          </ol>
        </div>
        <div className="card p-6 text-sm text-slate-400">
          <p className="text-white">Need help?</p>
          <p className="mt-2">
            Ensure the wallet extension has signing permissions enabled for polkaproof.app and
            refresh if the nonce expires.
          </p>
        </div>
      </section>

      <CheckInForm eventId={event.id} />
    </div>
  );
}
