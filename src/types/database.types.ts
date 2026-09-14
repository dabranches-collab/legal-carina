// Typed Data API contract for the authentication slice.
// Regenerate from the linked project after applying migrations; see docs/supabase-setup.md.
export interface FirmMemberRow {
  id: string
  firm_id: string
  user_id: string
  role: 'owner' | 'admin' | 'manager' | 'operator' | 'billing' | 'professional' | 'viewer' | 'auditor'
  active: boolean
}

export type ApplicationRole = FirmMemberRow['role']

export interface Database {
  public: {
    Tables: {
      firm_members: { Row: FirmMemberRow; Insert: never; Update: never; Relationships: [] }
      security_events: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: never; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      get_my_access_status: { Args: Record<PropertyKey, never>; Returns: Array<{ active:boolean; must_change_pin:boolean }> }
      get_work_entry_form_options: { Args: Record<PropertyKey, never>; Returns: Record<string, unknown> }
      get_work_entry_for_edit: { Args: { p_work_entry_id:string }; Returns: Record<string, unknown>|null }
      create_work_entry: { Args: { p_work_date:string; p_client_profile_id:string; p_matter_id:string|null; p_professional_id:string; p_billing_entity_id:string|null; p_activity_description:string; p_duration_minutes:number; p_observations:string|null; p_hourly_rate:number|null }; Returns:string }
      update_work_entry_details: { Args: { p_work_entry_id:string; p_work_date:string; p_client_profile_id:string; p_matter_id:string|null; p_professional_id:string; p_activity_description:string; p_observations:string|null }; Returns:undefined }
      update_work_entry_full: { Args: { p_work_entry_id:string; p_values:Record<string,unknown>; p_reason:string }; Returns:undefined }
      delete_work_entry: { Args: { p_work_entry_id:string; p_reason:string }; Returns:undefined }
      bulk_update_work_entries: { Args: { p_work_entry_ids:string[]; p_action:string; p_value:unknown; p_reason:string }; Returns:number }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
