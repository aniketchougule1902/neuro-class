-- =========================================================
-- NEUROCLASS SUPABASE DATABASE SCHEMA
-- Features: Classrooms, Facecam biometric attendance, exam proctoring, x402 USDC payments
-- =========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  displayName TEXT,
  photoURL TEXT,
  mobile_number TEXT,
  role TEXT DEFAULT 'teacher',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  subject TEXT DEFAULT 'Computer Science',
  user_id TEXT NOT NULL,
  students INTEGER DEFAULT 0,
  attendance TEXT DEFAULT '0%',
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STUDENTS ENROLLMENT (BIOMETRIC)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id TEXT,
  name TEXT NOT NULL,
  roll_number TEXT,
  phone TEXT,
  email TEXT,
  face_samples JSONB DEFAULT '[]'::jsonb,
  -- 128-dimensional face-api descriptor used for local matching.
  -- Store the vector, never a raw camera frame, in the matching path.
  face_descriptor JSONB,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(classroom_id, email)
);

-- 4. TESTS & EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'Computer Science',
  duration_mins INTEGER DEFAULT 45,
  total_marks INTEGER DEFAULT 50,
  questions JSONB DEFAULT '[]'::jsonb,
  proctoring_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TEST SUBMISSIONS & PROCTORING LOGS
CREATE TABLE IF NOT EXISTS public.test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  marks_obtained INTEGER DEFAULT 0,
  total_marks INTEGER DEFAULT 50,
  percentage INTEGER DEFAULT 0,
  grade TEXT DEFAULT 'A',
  feedback TEXT,
  answers JSONB DEFAULT '[]'::jsonb,
  proctoring_violations JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. EXAM ATTEMPTS & PROCTORING EVENTS
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'abandoned', 'flagged')),
  score NUMERIC,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS attempts_test_id_idx ON public.attempts (test_id);
CREATE INDEX IF NOT EXISTS attempts_student_id_idx ON public.attempts (student_id);
CREATE INDEX IF NOT EXISTS attempts_status_idx ON public.attempts (status);

-- 7. BIOMETRIC ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT DEFAULT 'Present',
  verified_method TEXT DEFAULT 'Face-ID Biometric',
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS public.evaluations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  studentName TEXT NOT NULL,
  rollNumber TEXT,
  subject TEXT,
  assessmentName TEXT,
  marksObtained NUMERIC,
  totalMarks NUMERIC,
  percentage NUMERIC,
  grade TEXT,
  feedback TEXT,
  strengths JSONB,
  weaknesses JSONB,
  improvementSuggestions JSONB,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. x402 PROTOCOL SETTLEMENT LEDGER
-- This table is intentionally server-managed. The backend uses SUPABASE_SERVICE_ROLE_KEY.
-- The legacy amount_algo column is retained for compatibility with any historical rows;
-- new payments use USDC ASA metadata and settlement_tx_id.
CREATE TABLE IF NOT EXISTS public.x402_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT UNIQUE NOT NULL,
  amount_algo NUMERIC CHECK (amount_algo IS NULL OR amount_algo > 0),
  service_name TEXT NOT NULL,
  payer_address TEXT,
  receiver_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'settled' CHECK (status IN ('settled', 'refund_pending', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  network TEXT,
  asset_id BIGINT,
  amount_usdc_micro BIGINT,
  settlement_tx_id TEXT,
  request_path TEXT,
  payment_response JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS x402_payments_created_at_idx ON public.x402_payments (created_at DESC);
CREATE INDEX IF NOT EXISTS x402_payments_payer_address_idx ON public.x402_payments (payer_address);
CREATE UNIQUE INDEX IF NOT EXISTS x402_payments_settlement_tx_id_idx
  ON public.x402_payments (settlement_tx_id)
  WHERE settlement_tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS x402_payments_network_asset_idx
  ON public.x402_payments (network, asset_id);
CREATE INDEX IF NOT EXISTS x402_payments_request_path_idx
  ON public.x402_payments (request_path);

-- RLS Row-Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x402_payments ENABLE ROW LEVEL SECURITY;

-- Existing public classroom discovery policies retained for the current app flow.
CREATE POLICY "Allow anonymous select users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select classrooms" ON public.classrooms FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert classrooms" ON public.classrooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select tests" ON public.tests FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert tests" ON public.tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select evaluations" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert evaluations" ON public.evaluations FOR INSERT WITH CHECK (true);

-- Attendance, attempts, and submissions are limited to the authenticated student or
-- the authenticated instructor who owns the relevant classroom. The service role bypasses RLS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'attendance'
      AND policyname = 'Authenticated classroom owners manage attendance'
  ) THEN
    CREATE POLICY "Authenticated classroom owners manage attendance"
      ON public.attendance FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.classrooms c
          WHERE c.id = attendance.classroom_id
            AND c.user_id = auth.uid()::text
        )
        OR EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = attendance.student_id
            AND s.user_id = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.classrooms c
          WHERE c.id = attendance.classroom_id
            AND c.user_id = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'attempts'
      AND policyname = 'Authenticated users manage own or classroom attempts'
  ) THEN
    CREATE POLICY "Authenticated users manage own or classroom attempts"
      ON public.attempts FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = attempts.student_id
            AND s.user_id = auth.uid()::text
        )
        OR EXISTS (
          SELECT 1
          FROM public.tests t
          JOIN public.classrooms c ON c.id = t.classroom_id
          WHERE t.id = attempts.test_id
            AND c.user_id = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = attempts.student_id
            AND s.user_id = auth.uid()::text
        )
        OR EXISTS (
          SELECT 1
          FROM public.tests t
          JOIN public.classrooms c ON c.id = t.classroom_id
          WHERE t.id = attempts.test_id
            AND c.user_id = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'test_submissions'
      AND policyname = 'Authenticated users manage permitted submissions'
  ) THEN
    CREATE POLICY "Authenticated users manage permitted submissions"
      ON public.test_submissions FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = test_submissions.student_id
            AND s.user_id = auth.uid()::text
        )
        OR EXISTS (
          SELECT 1
          FROM public.tests t
          JOIN public.classrooms c ON c.id = t.classroom_id
          WHERE t.id = test_submissions.test_id
            AND c.user_id = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = test_submissions.student_id
            AND s.user_id = auth.uid()::text
        )
        OR EXISTS (
          SELECT 1
          FROM public.tests t
          JOIN public.classrooms c ON c.id = t.classroom_id
          WHERE t.id = test_submissions.test_id
            AND c.user_id = auth.uid()::text
        )
      );
  END IF;
END $$;

-- No anon/authenticated policies are created for the x402 ledger. The server service
-- role performs ledger operations and bypasses RLS.
DROP POLICY IF EXISTS "Allow anonymous select x402" ON public.x402_payments;
DROP POLICY IF EXISTS "Allow anonymous insert x402" ON public.x402_payments;
DROP POLICY IF EXISTS "Allow anonymous update x402" ON public.x402_payments;

-- The application is non-custodial. Legacy public.user_wallets is intentionally absent
-- and removed by supabase/migrations/20260813053600_remove_legacy_user_wallets.sql.
