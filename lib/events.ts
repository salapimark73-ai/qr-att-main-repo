import { supabase } from './supabase';

export type Event = {
  eventId: string;   // the public event code (from the UI, e.g. EVT-2026-0002)
  title: string;
  start: string;
  end: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
  status?: 'open' | 'closed';
  venue?: string | null;
};

export async function createEvent(
  event: Event,
  teacherId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').upsert(
    {
      event_code: event.eventId,
      title: event.title,
      start_time: event.start || null,
      end_time: event.end || null,
      created_by: teacherId,
    },
    { onConflict: 'event_code' }
  );

  return { error: error?.message ?? null };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}

// Events a student can still check in to: not closed and not finished yet.
export async function getOpenEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });

  if (error || !data) return [];

  const now = Date.now();
  return (data as CloudEvent[]).filter(
    (e) =>
      (e.status ?? 'open') !== 'closed' &&
      (!e.end_time || new Date(e.end_time).getTime() >= now)
  );
}
