// Auto-generated from the connected Supabase schema. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      recurring_expenses: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          currency: string
          category_id: string | null
          frequency: string
          start_date: string
          next_due_date: string | null
          auto_create: boolean
          active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}