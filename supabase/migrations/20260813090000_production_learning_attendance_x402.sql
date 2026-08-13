-- NeuroClass production hardening: attendance authority, learning context, and x402 observability

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS capture_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS marked_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.attendance
  ALTER COLUMN classroom_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_session_student_idx
  ON public.attendance (session_id, student_id)
  WHERE session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Class attendance',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
  nonce TEXT UNIQUE NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS attendance_sessions_classroom_idx
  ON public.attendance_sessions (classroom_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_session_id_fkey') THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.attendance_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE NOT NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected')),
  resolved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.classroom_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  uploader_id TEXT NOT NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'ready', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS classroom_materials_classroom_idx
  ON public.classroom_materials (classroom_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Classroom learning thread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.learning_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.learning_threads(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.project_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_id UUID,
  payment_tx_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.project_ideas ADD COLUMN IF NOT EXISTS payment_tx_id TEXT;

CREATE TABLE IF NOT EXISTS public.x402_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  settlement_tx_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS x402_entitlement_subject_resource_idx
  ON public.x402_entitlements (resource_id, subject_id, settlement_tx_id);

CREATE TABLE IF NOT EXISTS public.x402_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.x402_payments(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS x402_payment_events_payment_idx
  ON public.x402_payment_events (payment_id, occurred_at ASC);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x402_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x402_payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated classroom owners manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Attendance owners can read" ON public.attendance;
DROP POLICY IF EXISTS "Classroom owners can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Classroom owners can update attendance" ON public.attendance;

CREATE POLICY "Attendance owners can read" ON public.attendance FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = attendance.classroom_id AND c.user_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id::text = attendance.student_id AND s.user_id = auth.uid()::text)
);
CREATE POLICY "Classroom owners can insert attendance" ON public.attendance FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = attendance.classroom_id AND c.user_id = auth.uid()::text)
  AND attendance.marked_by = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.attendance_sessions s
    WHERE s.id = attendance.session_id
      AND s.classroom_id = attendance.classroom_id
      AND s.teacher_id = auth.uid()::text
      AND s.status = 'open'
      AND (s.ends_at IS NULL OR s.ends_at > now())
  )
);
CREATE POLICY "Classroom owners can update attendance" ON public.attendance FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = attendance.classroom_id AND c.user_id = auth.uid()::text))
WITH CHECK (EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = attendance.classroom_id AND c.user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Classroom owners manage attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Classroom owners manage attendance sessions" ON public.attendance_sessions FOR ALL TO authenticated
USING (teacher_id = auth.uid()::text AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_id AND c.user_id = auth.uid()::text))
WITH CHECK (teacher_id = auth.uid()::text AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_id AND c.user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Students create their own attendance appeals" ON public.attendance_appeals;
CREATE POLICY "Students create their own attendance appeals" ON public.attendance_appeals FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid()::text);
CREATE POLICY "Attendance appeal participants can read" ON public.attendance_appeals FOR SELECT TO authenticated
USING (student_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_id AND c.user_id = auth.uid()::text));
CREATE POLICY "Classroom owners resolve attendance appeals" ON public.attendance_appeals FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_id AND c.user_id = auth.uid()::text))
WITH CHECK (EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_id AND c.user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Students manage own project ideas" ON public.project_ideas;
CREATE POLICY "Students manage own project ideas" ON public.project_ideas FOR ALL TO authenticated
USING (student_user_id = auth.uid()::text) WITH CHECK (student_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Students manage own learning threads" ON public.learning_threads;
CREATE POLICY "Students manage own learning threads" ON public.learning_threads FOR ALL TO authenticated
USING (student_user_id = auth.uid()::text) WITH CHECK (student_user_id = auth.uid()::text);
CREATE POLICY "Students read learning messages" ON public.learning_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.learning_threads t WHERE t.id = thread_id AND t.student_user_id = auth.uid()::text));

-- Material rows are readable by enrolled students and owned teachers; writes happen through the backend.
CREATE POLICY "Classroom participants read materials" ON public.classroom_materials FOR SELECT TO authenticated
USING (
  uploader_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_id AND c.user_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.classroom_id = classroom_id AND s.user_id = auth.uid()::text)
);

-- The x402 ledger and event stream remain server-managed through the service role.
DROP POLICY IF EXISTS "Allow anonymous select x402 events" ON public.x402_payment_events;
