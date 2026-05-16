-- Execute this in the SQL Editor of your finapp Supabase project (mndkjjxtuqizpvkjnnde)

CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'en_negociacion', 'cerrado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (optional depending on your finapp security setup)
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- If you want anyone with the anon key to be able to insert leads (from the Innomind landing page):
CREATE POLICY "Allow public inserts to crm_leads" ON public.crm_leads
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- If you want authenticated users to view/update leads in the finapp dashboard:
CREATE POLICY "Allow authenticated full access to crm_leads" ON public.crm_leads
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow anon read access if needed for testing (not recommended in production if anon shouldn't see all leads)
-- CREATE POLICY "Allow anon read access to crm_leads" ON public.crm_leads FOR SELECT TO anon USING (true);
