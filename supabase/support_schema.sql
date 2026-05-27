-- Execute this in the SQL Editor of your finapp Supabase project (mndkjjxtuqizpvkjnnde)

-- 1. Support Tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number SERIAL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'otro' CHECK (category IN ('bug', 'duda', 'mejora', 'otro')),
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
    status TEXT DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_progreso', 'en_espera', 'resuelto', 'cerrado')),
    user_email TEXT NOT NULL,
    user_name TEXT,
    user_phone TEXT,
    company_name TEXT,
    assigned_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Ticket Messages table (conversation thread)
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    message TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies for support_tickets
DROP POLICY IF EXISTS "anon_insert_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "anon_select_own_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "anon_update_own_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "auth_full_tickets" ON public.support_tickets;

CREATE POLICY "anon_insert_tickets" ON public.support_tickets
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select_own_tickets" ON public.support_tickets
    FOR SELECT TO anon USING (true);

CREATE POLICY "anon_update_own_tickets" ON public.support_tickets
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_tickets" ON public.support_tickets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Policies for ticket_messages
DROP POLICY IF EXISTS "anon_insert_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "anon_select_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "auth_full_messages" ON public.ticket_messages;

CREATE POLICY "anon_insert_messages" ON public.ticket_messages
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select_messages" ON public.ticket_messages
    FOR SELECT TO anon USING (true);

CREATE POLICY "auth_full_messages" ON public.ticket_messages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON public.ticket_messages(ticket_id);
