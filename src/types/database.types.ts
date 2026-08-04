// Typed Data API contract for the authentication slice.
// Regenerate from the linked project after applying migrations; see docs/supabase-setup.md.
export interface LegalDocumentRow {
  id: string
  document_type: 'terms_of_service' | 'privacy_policy' | 'gdpr_terms'
  version: string
  title: string
  body_markdown: string
  effective_at: string
  content_hash: string
  status: 'draft' | 'published' | 'retired'
}

export interface FirmMemberRow {
  id: string
  firm_id: string
  user_id: string
  role: 'owner' | 'admin' | 'billing' | 'professional' | 'viewer' | 'auditor'
  active: boolean
}

export type ApplicationRole = FirmMemberRow['role']

export interface Database {
  public: {
    Tables: {
      legal_documents: { Row: LegalDocumentRow; Insert: never; Update: never; Relationships: [] }
      user_legal_acceptances: {
        Row: { id: string; user_id: string; legal_document_id: string; document_type: string; document_version: string; accepted_at: string; evidence: Record<string, unknown> }
        Insert: never; Update: never; Relationships: []
      }
      firm_members: { Row: FirmMemberRow; Insert: never; Update: never; Relationships: [] }
      security_events: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: never; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      get_pending_legal_documents: { Args: Record<PropertyKey, never>; Returns: LegalDocumentRow[] }
      accept_legal_documents: { Args: { target_document_ids: string[]; acceptance_evidence: Record<string, unknown> }; Returns: number }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
