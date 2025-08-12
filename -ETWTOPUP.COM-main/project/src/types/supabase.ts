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
      game_products: {
        Row: {
          id: string
          name: string
          diamonds: number | null
          price: number
          currency: string
          type: string
          game: string
          image: string | null
          code: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          diamonds?: number | null
          price: number
          currency: string
          type: string
          game: string
          image?: string | null
          code?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          diamonds?: number | null
          price?: number
          currency?: string
          type?: string
          game?: string
          image?: string | null
          code?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      mlbb_products: {
        Row: {
          id: number
          name: string
          diamonds: number | null
          price: number
          currency: string
          type: string
          image: string | null
          code: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          diamonds?: number | null
          price: number
          currency: string
          type: string
          image?: string | null
          code?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          diamonds?: number | null
          price?: number
          currency?: string
          type?: string
          image?: string | null
          code?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      freefire_products: {
        Row: {
          id: number
          name: string
          diamonds: number | null
          price: number
          currency: string
          type: string
          image: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          diamonds?: number | null
          price: number
          currency: string
          type: string
          image?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          diamonds?: number | null
          price?: number
          currency?: string
          type?: string
          image?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      admin_settings: {
        Row: {
          id: string
          password: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          password: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          password?: string
          created_at?: string
          updated_at?: string
        }
      }
      resellers: {
        Row: {
          id: string
          username: string
          password: string
          active: boolean
          created_at: string
          updated_at: string
          last_login: string | null
          login_count: number
          devices: string[]
        }
        Insert: {
          id?: string
          username: string
          password: string
          active?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
          login_count?: number
          devices?: string[]
        }
        Update: {
          id?: string
          username?: string
          password?: string
          active?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
          login_count?: number
          devices?: string[]
        }
      }
      reseller_prices: {
        Row: {
          id: number
          product_id: number
          game: string
          price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          product_id: number
          game: string
          price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          product_id?: number
          game?: string
          price?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}