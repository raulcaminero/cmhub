-- SQL Script to enable Row Level Security (RLS) on all public tables in Supabase
-- Run this in Supabase Dashboard -> SQL Editor for project rzumdrqyerlwdiftxzxb

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;
