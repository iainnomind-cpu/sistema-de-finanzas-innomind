'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

export default function GlobalLeadListener() {
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    console.log("GlobalLeadListener mounted, setting up subscription...");
    
    const channel = supabase
      .channel('global-leads-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_leads' }, (payload) => {
        console.log("GlobalLeadListener caught new lead:", payload);
        const newLead = payload.new;
        const isTrial = newLead.service_of_interest === 'Trak (Proyectos)' || newLead.service_of_interest === 'Corē (ERP/CRM)';
        const title = isTrial ? '¡Nueva Prueba Gratuita!' : '¡Nueva Solicitud de Demo/Cotización!';
        
        toast(`${title} de ${newLead.full_name} (${newLead.company_name})`, 'success');
      })
      .subscribe((status) => {
        console.log("GlobalLeadListener subscription status:", status);
      });

    return () => {
      console.log("GlobalLeadListener unmounting, removing subscription...");
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return null;
}
