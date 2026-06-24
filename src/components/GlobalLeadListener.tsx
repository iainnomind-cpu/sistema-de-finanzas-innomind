'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

export default function GlobalLeadListener() {
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    let lastChecked = new Date().toISOString();

    const checkNewLeads = async () => {
      const { data } = await supabase
        .from('crm_leads')
        .select('*')
        .gt('created_at', lastChecked)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        data.forEach(newLead => {
          const isTrial = newLead.service_of_interest === 'Trak (Proyectos)' || newLead.service_of_interest === 'Corē (ERP/CRM)';
          const title = isTrial ? '¡Nueva Prueba Gratuita!' : '¡Nueva Solicitud de Demo/Cotización!';
          toast(`${title} de ${newLead.full_name} (${newLead.company_name})`, 'success');
        });
        lastChecked = data[data.length - 1].created_at;
      }
    };

    const interval = setInterval(checkNewLeads, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [toast]);

  return null;
}
