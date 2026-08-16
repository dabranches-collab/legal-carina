import type { CanonicalField } from './types'

export const fieldLabels: Record<CanonicalField, string> = {
  date: 'DATA', partyType: 'PART / SOC', clientName: 'CLIENTE', clientCode: 'CÓDIGO CLIENTE',
  activity: 'ACTIVIDADE', responsible: 'RESPONSÁVEL', duration: 'DURAÇÃO', hourlyRate: 'VALOR HORA',
  amount: 'VALOR', billingEntity: 'SOCIEDADE FACTURA', status: 'STATUS', invoiced: 'FACTURADO',
  invoiceDate: 'DATA FACT', archive: 'ARQUIVADO', paid: 'PAGO', notes: 'OBSERVAÇÕES', year: 'ANO',
  tableDuration: 'TEMPO TABELA',
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()

export function inferMapping(headers: string[]): Record<CanonicalField, number | null> {
  return Object.fromEntries(Object.entries(fieldLabels).map(([field, label]) => {
    const index = headers.findIndex((header) => normalize(header) === normalize(label))
    return [field, index < 0 ? null : index]
  })) as Record<CanonicalField, number | null>
}
