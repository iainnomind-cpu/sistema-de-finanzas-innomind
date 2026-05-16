-- Execute this in the SQL Editor of your finapp Supabase project (mndkjjxtuqizpvkjnnde)

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add the new columns if they don't exist
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS service_of_interest TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nuevo';

-- 3. Update the CHECK constraint for the new statuses
-- First, drop the existing constraint if we previously created it
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;

-- Then add the new constraint with all the new statuses
ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_status_check 
CHECK (status IN ('nuevo', 'contactado', 'agendado', 'cotizado', 'en_negociacion', 'ganado', 'perdido'));

-- 4. Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Allow public inserts to crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Allow authenticated full access to crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Allow anon read access to crm_leads" ON public.crm_leads;

-- 6. Recreate the policies
CREATE POLICY "Allow public inserts to crm_leads" ON public.crm_leads
    FOR INSERT 
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to crm_leads" ON public.crm_leads
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
