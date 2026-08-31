// Auto-generated from the connected Supabase schema. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          icon: string | null
          color: string | null
          created_at: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          category_id: string
          title: string
          amount: string
          currency: string
          notes: string | null
          expense_date: string
          created_at: string
          updated_at: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          monthly_limit: string
          currency: string
          created_at: string
          updated_at: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          preferred_currency: string
          created_at: string
          updated_at: string
        }
      }
    }
  }
}