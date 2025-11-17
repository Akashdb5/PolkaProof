import { supabaseReadClient } from "./supabase";

export type EventRecord = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  deadline: string | null;
  location: string | null;
  banner_url: string | null;
  tags: string[] | null;
  metadata: Record<string, any> | null;
};

export type PolkaProofMetrics = {
  events: number;
  checkins: number;
  attendees: number;
  organizers: number;
};

export const EVENTS_PAGE_SIZE = 6;

type ListParams = {
  page?: number;
  query?: string;
  tag?: string;
};

export async function listEvents({
  page = 1,
  query,
  tag
}: ListParams = {}) {
  if (!supabaseReadClient) {
    return { events: [] as EventRecord[], total: 0 };
  }

  const from = (Math.max(page, 1) - 1) * EVENTS_PAGE_SIZE;
  const to = from + EVENTS_PAGE_SIZE - 1;

  let builder = supabaseReadClient
    .from("events")
    .select("*", { count: "exact" })
    .order("start_at", { ascending: true });

  if (query) {
    builder = builder.ilike("title", `%${query}%`);
  }

  if (tag) {
    builder = builder.contains("tags", [tag]);
  }

  const { data, error, count } = await builder.range(from, to);

  if (error) {
    console.error("Failed to list events", error);
    return { events: [] as EventRecord[], total: 0 };
  }

  return {
    events: (data as EventRecord[]) ?? [],
    total: count ?? 0
  };
}

export async function getEventByIdentifier(
  id: string
): Promise<EventRecord | null> {
  if (!supabaseReadClient) return null;

  const { data, error } = await supabaseReadClient
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as EventRecord) ?? null;
}

export async function getPolkaProofMetrics(): Promise<PolkaProofMetrics> {
  if (!supabaseReadClient) {
    return { events: 0, checkins: 0, attendees: 0, organizers: 0 };
  }

  const { data, error } = await supabaseReadClient.rpc("get_polkaproof_metrics");

  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      return {
        events: Number(row.events ?? 0),
        checkins: Number(row.checkins ?? 0),
        attendees: Number(row.attendees ?? 0),
        organizers: Number(row.organizers ?? 0)
      };
    }
  }

  const [eventsCount, checkinsCount, attendeesCount, organizersCount] =
    await Promise.all([
      countRows("events"),
      countRows("event_attendance"),
      countRows("profiles"),
      countDistinctOrganizers()
    ]);

  return {
    events: eventsCount,
    checkins: checkinsCount,
    attendees: attendeesCount,
    organizers: organizersCount
  };
}

async function countRows(table: string) {
  const { count, error } = await supabaseReadClient!
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(`Failed to count ${table}`, error);
    return 0;
  }

  return count ?? 0;
}

async function countDistinctOrganizers() {
  const { data, error } = await supabaseReadClient!
    .from("events")
    .select("organizer_id");

  if (error || !data) {
    console.error("Failed to count organizers", error);
    return 0;
  }

  return new Set(
    (data as Array<{ organizer_id: string | null }>).map(
      (row) => row.organizer_id
    ).filter(Boolean)
  ).size;
}
