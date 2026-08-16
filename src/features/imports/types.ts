export const canonicalFields = [
  'date', 'partyType', 'clientName', 'clientCode', 'activity', 'responsible',
  'duration', 'hourlyRate', 'amount', 'billingEntity', 'status', 'invoiced',
  'invoiceDate', 'archive', 'paid', 'notes', 'year', 'tableDuration',
] as const

export type CanonicalField = (typeof canonicalFields)[number]
export type CellSnapshot = { raw: unknown; text: string; formula?: string }
export type ImportRow = {
  sourceRow: number
  cells: Partial<Record<CanonicalField, CellSnapshot>>
  normalized: { date?: string; invoiceDate?: string; clientType?: 'individual'|'company'; durationMinutes?: number; hourlyRate?: number; importedAmount?: number; calculatedAmount?: number; effectiveAmount?: number; invoiced: boolean; paid: boolean; archive?: 'gaveta'|'dossier'|'findos'|'digital'|'other'; archived: boolean }
  issues: ImportIssue[]
  fingerprint: string
}
export type ImportIssue = { severity: 'warning' | 'error'; code: string; message: string }
export type ClientDirectoryEntry = { sourceRow:number; name:string; code:string; clientType?:'individual'|'company'; original:{name:string;code:string;category:string} }
export type ImportSummary = {
  totalRows: number; validRows: number; warningRows: number; invalidRows: number
  newClients: number; existingClients: number; possibleDuplicates: number; withoutPrice: number
  invoicedRows: number; paidRows: number; archivedRows: number; financialImpact: number
}
export type WorkbookAnalysis = {
  fileName: string; fileSize: number; sha256: string; sheets: string[]; selectedSheet: string
  headers: string[]; mapping: Record<CanonicalField, number | null>; rows: ImportRow[]
  summary: ImportSummary; preview: string[][]; ignoredRows: number; knownClientCodes: string[]; clientDirectory:ClientDirectoryEntry[]
}
