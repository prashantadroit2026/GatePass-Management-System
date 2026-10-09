-- =====================================================
-- Migration 004: Add 'expired' to request_status enum
-- =====================================================
-- request_service.expire_stale_requests() sets pending requests whose
-- validity window has passed to status='expired', but the enum created in
-- migration 002 did not include that value, so the update failed at the
-- database level. Safe to re-run.

ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'expired';
