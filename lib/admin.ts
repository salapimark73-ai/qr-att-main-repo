import { supabase } from './supabase';
import type { Role } from './profiles';

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

export type AdminEvent = {
  id: string;
  event_code: string;
  title: string;
  venue: string | null;
  description: string | null;
  status: 'open' | 'closed';
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
  attendeeCount: number;
};

export type AdminAttendance = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
  studentName: string;
  studentEmail: string;
  eventTitle: string;
  eventCode: string;
};

type Result = { error: string | null };

// ---------------- USERS ----------------
export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });
  return (data ?? []) as AdminUser[];
}

export async function updateUser(
  id: string,
  updates: { full_name?: string; role?: Role }
): Promise<Result> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

export async function createUser(input: {
  email: string;
  password: string;
  full_name: string;
  role: Role;
}): Promise<Result> {
  const { error } = await supabase.rpc('admin_create_user', {
    p_email: input.email,
    p_password: input.password,
    p_full_name: input.full_name,
    p_role: input.role,
  });
  return { error: error?.message ?? null };
}

export async function deleteUser(id: string): Promise<Result> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id });
  return { error: error?.message ?? null };
}

// ---------------- EVENTS ----------------
export async function listAllEvents(): Promise<AdminEvent[]> {
  const { data } = await supabase
    .from('events')
    .select('*, attendance(count)')
    .order('created_at', { ascending: false });
  return (data ?? []).map((e: any) => ({
    ...e,
    status: e.status ?? 'open',
    attendeeCount: e.attendance?.[0]?.count ?? 0,
  }));
}

export type EventInput = {
  event_code: string;
  title: string;
  venue: string;
  description: string;
  status: 'open' | 'closed';
  start_time: string;
  end_time: string;
};

export async function saveEvent(
  input: EventInput,
  adminId: string,
  existingId?: string
): Promise<Result> {
  const row = {
    event_code: input.event_code,
    title: input.title,
    venue: input.venue || null,
    description: input.description || null,
    status: input.status,
    start_time: input.start_time,
    end_time: input.end_time,
  };
  const { error } = existingId
    ? await supabase.from('events').update(row).eq('id', existingId)
    : await supabase.from('events').insert([{ ...row, created_by: adminId }]);
  if (error?.code === '23505') return { error: 'That event code is already used.' };
  return { error: error?.message ?? null };
}

export async function setEventStatus(
  id: string,
  status: 'open' | 'closed'
): Promise<Result> {
  const { error } = await supabase.from('events').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteEvent(id: string): Promise<Result> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ---------------- ATTENDANCE ----------------
export async function listAllAttendance(): Promise<AdminAttendance[]> {
  const [{ data: att }, { data: profs }, { data: evs }] = await Promise.all([
    supabase
      .from('attendance')
      .select('id, student_id, event_id, scanned_at')
      .order('scanned_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email'),
    supabase.from('events').select('id, title, event_code'),
  ]);
  const pm: Record<string, any> = {};
  (profs ?? []).forEach((p: any) => (pm[p.id] = p));
  const em: Record<string, any> = {};
  (evs ?? []).forEach((e: any) => (em[e.id] = e));
  return (att ?? []).map((a: any) => ({
    ...a,
    studentName: pm[a.student_id]?.full_name || pm[a.student_id]?.email || 'Unknown',
    studentEmail: pm[a.student_id]?.email ?? '',
    eventTitle: em[a.event_id]?.title ?? 'Unknown event',
    eventCode: em[a.event_id]?.event_code ?? '',
  }));
}

export async function addAttendance(
  studentId: string,
  eventId: string
): Promise<Result> {
  const { error } = await supabase
    .from('attendance')
    .insert([{ student_id: studentId, event_id: eventId }]);
  if (error?.code === '23505') {
    return { error: 'This student is already recorded for that event.' };
  }
  return { error: error?.message ?? null };
}

export async function deleteAttendance(id: string): Promise<Result> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ---------------- REPORTS ----------------
export type Report = {
  totalUsers: number;
  students: number;
  teachers: number;
  admins: number;
  totalEvents: number;
  openEvents: number;
  totalAttendance: number;
  perEvent: { id: string; title: string; code: string; count: number; rate: number }[];
  topStudents: { id: string; name: string; count: number }[];
  recent: { id: string; studentName: string; eventTitle: string; scannedAt: string }[];
  last7: { label: string; count: number }[];
};

export async function getReport(): Promise<Report> {
  const [users, events, attendance] = await Promise.all([
    listUsers(),
    listAllEvents(),
    listAllAttendance(),
  ]);
  const students = users.filter((u) => u.role === 'student').length;
  const counts: Record<string, { name: string; count: number }> = {};
  attendance.forEach((a) => {
    counts[a.student_id] ??= { name: a.studentName, count: 0 };
    counts[a.student_id].count += 1;
  });
  const last7: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    last7.push({
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      count: attendance.filter((a) => {
        const t = new Date(a.scanned_at).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length,
    });
  }

  return {
    totalUsers: users.length,
    students,
    teachers: users.filter((u) => u.role === 'teacher').length,
    admins: users.filter((u) => u.role === 'admin').length,
    totalEvents: events.length,
    openEvents: events.filter((e) => e.status === 'open').length,
    totalAttendance: attendance.length,
    perEvent: events.map((e) => ({
      id: e.id,
      title: e.title,
      code: e.event_code,
      count: e.attendeeCount,
      rate: students ? Math.round((e.attendeeCount / students) * 100) : 0,
    })),
    topStudents: Object.entries(counts)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    recent: attendance.slice(0, 5).map((a) => ({
      id: a.id,
      studentName: a.studentName,
      eventTitle: a.eventTitle,
      scannedAt: a.scanned_at,
    })),
    last7,
  };
}
