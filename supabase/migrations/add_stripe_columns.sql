-- Add Stripe subscription columns to crm_leads
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS plan TEXT;

-- subscription_status values:
--   'none'          → no ha iniciado proceso de pago
--   'trialing'      → en período de prueba de 14 días
--   'trial_ending'  → prueba termina en 3 días
--   'active'        → pago exitoso, suscripción activa
--   'past_due'      → pago fallido, esperando reintento
--   'canceled'      → canceló la suscripción

-- plan values:
--   'core_monthly', 'core_annual', 'trak_monthly', 'trak_annual'
