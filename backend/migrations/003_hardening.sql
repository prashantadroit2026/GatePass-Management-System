-- =====================================================
-- Migration 003: Gatepass Security & Concurrency Hardening
-- =====================================================

-- 1. Ensure gate_logs table exists and add FK constraint
CREATE TABLE IF NOT EXISTS public.gate_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.gatepass_requests(id) ON DELETE CASCADE,
  logged_by     UUID NOT NULL REFERENCES public.users(id),
  direction     TEXT NOT NULL,
  notes         TEXT,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure FK constraint if table existed previously
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_gate_logs_request'
  ) THEN
    ALTER TABLE public.gate_logs
      DROP CONSTRAINT IF EXISTS gate_logs_request_id_fkey,
      ADD CONSTRAINT fk_gate_logs_request
      FOREIGN KEY (request_id) REFERENCES public.gatepass_requests(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. CHECK constraint: valid_until > valid_from on gatepass_requests
ALTER TABLE public.gatepass_requests
  DROP CONSTRAINT IF EXISTS chk_requests_validity_window;

ALTER TABLE public.gatepass_requests
  ADD CONSTRAINT chk_requests_validity_window
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from);

-- 3. CHECK constraint: direction in ('in', 'out')
ALTER TABLE public.gate_logs
  DROP CONSTRAINT IF EXISTS chk_gate_logs_direction;

ALTER TABLE public.gate_logs
  ADD CONSTRAINT chk_gate_logs_direction
  CHECK (direction IN ('in', 'out', 'IN', 'OUT'));

-- 4. Index on gate_logs(request_id, logged_at) and (request_id, created_at)
CREATE INDEX IF NOT EXISTS idx_gate_logs_request_logged_at
  ON public.gate_logs(request_id, logged_at);

CREATE INDEX IF NOT EXISTS idx_gate_logs_request_created_at
  ON public.gate_logs(request_id, created_at);

-- 5. Atomic RPC function for gate movement logging with row-level locking
CREATE OR REPLACE FUNCTION public.log_gate_movement_rpc(
  p_request_id UUID,
  p_security_user_id UUID,
  p_direction TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req RECORD;
  v_direction_lower TEXT := lower(p_direction);
  v_log_count INT;
  v_last_direction TEXT;
  v_new_log RECORD;
BEGIN
  -- Validate direction parameter
  IF v_direction_lower NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'Invalid direction: %. Must be "in" or "out"', p_direction
      USING ERRCODE = '22023';
  END IF;

  -- 1. Lock the gatepass_requests row to serialize concurrent scans
  SELECT * INTO v_req
  FROM public.gatepass_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gatepass request % not found', p_request_id
      USING ERRCODE = 'P0002'; -- 404
  END IF;

  -- 2. Verify request status is approved
  IF v_req.status != 'approved' THEN
    RAISE EXCEPTION 'Cannot log movement for request in % status (must be approved)', v_req.status
      USING ERRCODE = '23514'; -- 409
  END IF;

  -- 3. Verify validity window
  IF v_req.valid_from IS NOT NULL AND now() < v_req.valid_from THEN
    RAISE EXCEPTION 'Gatepass is not valid yet'
      USING ERRCODE = '22007';
  END IF;

  IF v_req.valid_until IS NOT NULL AND now() > v_req.valid_until THEN
    RAISE EXCEPTION 'Gatepass validity has expired'
      USING ERRCODE = '22008';
  END IF;

  -- 4. Count and check previous movements
  SELECT count(*), (SELECT direction FROM public.gate_logs WHERE request_id = p_request_id ORDER BY logged_at DESC LIMIT 1)
  INTO v_log_count, v_last_direction
  FROM public.gate_logs
  WHERE request_id = p_request_id;

  -- Sequence validation
  IF v_req.type = 'leave' THEN
    IF v_req.leave_type = 'full_leave' THEN
      IF v_log_count >= 1 THEN
        RAISE EXCEPTION 'Full leave gatepass already used (OUT completed)'
          USING ERRCODE = '23505';
      END IF;
      IF v_direction_lower != 'out' THEN
        RAISE EXCEPTION 'Full leave pass requires OUT movement'
          USING ERRCODE = '22023';
      END IF;
    ELSE
      -- Temporary outing: OUT then IN
      IF v_log_count = 0 THEN
        IF v_direction_lower != 'out' THEN
          RAISE EXCEPTION 'Outing pass requires OUT movement first'
            USING ERRCODE = '22023';
        END IF;
      ELSIF v_log_count = 1 THEN
        IF v_direction_lower != 'in' THEN
          RAISE EXCEPTION 'Outing pass already logged OUT; next movement must be IN'
            USING ERRCODE = '22023';
        END IF;
      ELSE
        RAISE EXCEPTION 'Outing pass is already completed'
          USING ERRCODE = '23505';
      END IF;
    END IF;
  ELSIF v_req.type IN ('visitor', 'vendor') THEN
    -- Visitor & Vendor: IN then OUT
    IF v_log_count = 0 THEN
      IF v_direction_lower != 'in' THEN
        RAISE EXCEPTION '% pass requires IN movement first', initcap(v_req.type::text)
          USING ERRCODE = '22023';
      END IF;
    ELSIF v_log_count = 1 THEN
      IF v_direction_lower != 'out' THEN
        RAISE EXCEPTION '% pass already logged IN; next movement must be OUT', initcap(v_req.type::text)
          USING ERRCODE = '22023';
      END IF;
    ELSE
      RAISE EXCEPTION '% pass is already completed', initcap(v_req.type::text)
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- 5. Insert log atomically
  INSERT INTO public.gate_logs (request_id, logged_by, direction, notes, logged_at)
  VALUES (p_request_id, p_security_user_id, v_direction_lower, p_notes, now())
  RETURNING * INTO v_new_log;

  RETURN to_jsonb(v_new_log);
END;
$$;
