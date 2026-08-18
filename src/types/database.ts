export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      config: {
        Row: {
          id: string
          is_active: boolean
          meeting_name: string | null
          meeting_date: string | null
          location: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          meeting_name?: string | null
          meeting_date?: string | null
          location?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          meeting_name?: string | null
          meeting_date?: string | null
          location?: string | null
        }
      }
      delegates: {
        Row: {
          id: string
          name: string
          unit: string
          status: string
          seat_number: string | null
          checkin_time: string | null
          phone: string | null
          is_substituted: boolean | null
          substitute_name: string | null
          substitute_unit: string | null
        }
        Insert: {
          id?: string
          name: string
          unit: string
          status?: string
          seat_number?: string | null
          checkin_time?: string | null
          phone?: string | null
          is_substituted?: boolean | null
          substitute_name?: string | null
          substitute_unit?: string | null
        }
        Update: {
          id?: string
          name?: string
          unit?: string
          status?: string
          seat_number?: string | null
          checkin_time?: string | null
          phone?: string | null
          is_substituted?: boolean | null
          substitute_name?: string | null
          substitute_unit?: string | null
        }
      }
      seats: {
        Row: {
          id: string
          seat_number: string
          status: string
          delegate_name: string | null
        }
        Insert: {
          id?: string
          seat_number: string
          status?: string
          delegate_name?: string | null
        }
        Update: {
          id?: string
          seat_number?: string
          status?: string
          delegate_name?: string | null
        }
      }
      checkin_logs: {
        Row: {
          id: string
          timestamp: string
          delegate_id: string | null
          delegate_name: string | null
          seat_number: string | null
        }
        Insert: {
          id?: string
          timestamp?: string
          delegate_id?: string | null
          delegate_name?: string | null
          seat_number?: string | null
        }
        Update: {
          id?: string
          timestamp?: string
          delegate_id?: string | null
          delegate_name?: string | null
          seat_number?: string | null
        }
      }
    }
  }
}
