/**
 * Format a number as Mexican Peso currency
 */
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to Spanish locale
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date string to relative time (e.g., "hace 2 días")
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'justo ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours}h`;
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return formatDate(dateStr);
}

/**
 * Format a month/year to Spanish name
 */
export function formatMonth(month: number, year?: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const name = months[month - 1] || '';
  return year ? `${name} ${year}` : name;
}

/**
 * Format a number with short notation (e.g., 1.5M, 250K)
 */
export function formatShortNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get current month and year
 */
export function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/**
 * Generate a CSS class based on status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Project statuses
    propuesta: 'bg-amber-100 text-amber-800',
    activo: 'bg-emerald-100 text-emerald-800',
    en_entrega: 'bg-blue-100 text-blue-800',
    completado: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
    // Receivable statuses
    pendiente: 'bg-amber-100 text-amber-800',
    parcial: 'bg-orange-100 text-orange-800',
    cobrada: 'bg-green-100 text-green-800',
    // Alert severities
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-amber-100 text-amber-800',
    critical: 'bg-red-100 text-red-800',
    // Client classifications
    recurrente: 'bg-emerald-100 text-emerald-800',
    unico: 'bg-slate-100 text-slate-800',
    inactivo: 'bg-gray-100 text-gray-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get human-readable label for statuses
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    propuesta: 'Propuesta',
    activo: 'Activo',
    en_entrega: 'En Entrega',
    completado: 'Completado',
    cancelado: 'Cancelado',
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    cobrada: 'Cobrada',
    cancelada: 'Cancelada',
    recurrente: 'Recurrente',
    unico: 'Único',
    inactivo: 'Inactivo',
    empresa: 'Empresa',
    persona_fisica: 'Persona Física',
    erp: 'ERP',
    crm: 'CRM',
    chatbot_ia: 'Chatbot IA',
    desarrollo_custom: 'Desarrollo Custom',
    anticipo_proyecto: 'Anticipo de Proyecto',
    saldo_proyecto: 'Saldo de Proyecto',
    mensualidad_recurrente: 'Mensualidad Recurrente',
    consultoria: 'Consultoría',
    otro: 'Otro',
    fijo: 'Fijo',
    variable: 'Variable',
    socio: 'Socio',
    inversion: 'Inversión',
    nomina: 'Nómina',
    transferencia: 'Transferencia',
    deposito: 'Depósito',
    efectivo: 'Efectivo',
    confirmado: 'Confirmado',
    en_cuenta: 'En Cuenta',
    entrada: 'Entrada',
    salida: 'Salida',
    sueldo: 'Sueldo',
    retiro_extraordinario: 'Retiro Extraordinario',
    socio_1: 'Socio 1',
    socio_2: 'Socio 2',
    ambos: 'Ambos',
  };
  return labels[status] || status;
}
