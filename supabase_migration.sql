-- Byttehjelpern — Supabase migration
-- Run this in Supabase Dashboard → SQL Editor
-- Date: 2026-04-01

-- Add abonnementer and trekk_extra columns to profiler table
ALTER TABLE profiler
  ADD COLUMN IF NOT EXISTS abonnementer JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS trekk_extra  JSONB DEFAULT '{}';

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiler'
  AND column_name IN ('abonnementer', 'trekk_extra');
