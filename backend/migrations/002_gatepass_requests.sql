-- Request type and status enums
CREATE TYPE request_type AS ENUM ('leave', 'visitor', 'vendor');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE item_direction AS ENUM ('in', 'out');

-- Main requests table (separate columns as decided)
CREATE TABLE public.gatepass_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              request_type NOT NULL,
  status            request_status NOT NULL DEFAULT 'pending',

  -- Who raised it
  requester_id      UUID NOT NULL REFERENCES public.users(id),

  -- Approval
  approver_id       UUID REFERENCES public.users(id),
  decided_at        TIMESTAMPTZ,
  rejection_reason  TEXT,

  -- Validity
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,

  -- ===== Type-specific columns =====
  -- Leave
  leave_type        TEXT,                 -- 'outing' | 'full_leave'
  leave_days        INTEGER,
  leave_reason      TEXT,

  -- Visitor
  visitor_name      TEXT,
  visitor_phone     TEXT,
  visitor_purpose   TEXT,

  -- Vendor
  vendor_item_direction  item_direction,
  vendor_item_description TEXT,
  vendor_company         TEXT,

  -- Common
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_requests_requester ON public.gatepass_requests(requester_id);
CREATE INDEX idx_requests_status ON public.gatepass_requests(status);
CREATE INDEX idx_requests_type ON public.gatepass_requests(type);
CREATE INDEX idx_requests_approver ON public.gatepass_requests(approver_id);

-- updated_at trigger
CREATE TRIGGER gatepass_requests_updated_at
  BEFORE UPDATE ON public.gatepass_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- CONSTRAINT: No self-approval EXCEPT Admin
-- =====================================================
CREATE OR REPLACE FUNCTION check_no_self_approval()
RETURNS TRIGGER AS $$
DECLARE
  requester_role user_role;
BEGIN
  -- Only check when status is being set to approved/rejected
  IF NEW.status IN ('approved', 'rejected') AND NEW.approver_id IS NOT NULL THEN
    IF NEW.approver_id = NEW.requester_id THEN
      SELECT role INTO requester_role FROM public.users WHERE id = NEW.requester_id;
      IF requester_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Self-approval is not allowed for role: %', requester_role;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_no_self_approval
  BEFORE INSERT OR UPDATE ON public.gatepass_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_no_self_approval();

-- Enable RLS
ALTER TABLE public.gatepass_requests ENABLE ROW LEVEL SECURITY;

-- Policies (basic – can be tightened later)
CREATE POLICY "Users can view own requests"
  ON public.gatepass_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "HR and Admin can view requests"
  ON public.gatepass_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('hr', 'admin', 'security')
    )
  );

CREATE POLICY "Users can create own requests"
  ON public.gatepass_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Approvers can update requests"
  ON public.gatepass_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('hr', 'admin')
    )
    OR auth.uid() = requester_id   -- requester can cancel own pending
  );
