export interface GameProduct {
  id: string | number;
  name: string;
  diamonds?: number;
  price: number;
  currency: string;
  type: 'diamonds' | 'subscription' | 'special';
  game: 'mlbb' | 'freefire';
  image?: string;
  code?: string; // Only used for MLBB products
  resellerPrice?: number; // Added for reseller pricing
}

export interface TopUpForm {
  userId: string;
  serverId: string;
  product: GameProduct | null;
  game: 'mlbb' | 'freefire';
  nickname?: string;
}

export interface MLBBValidationResponse {
  success: boolean;
  game: string;
  id: number;
  server: number;
  name: string;
}

export interface Reseller {
  id: string;
  username: string;
  password: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  login_count: number;
  devices: string[];
}

export interface ResellerPrice {
  id: number;
  product_id: number;
  game: string;
  price: number;
  created_at: string;
  updated_at: string;
}

// These arrays are kept for reference but will be replaced with Supabase data
export const MLBB_PRODUCTS_REFERENCE: GameProduct[] = [
  { id: 1, name: '11 Diamonds', diamonds: 11, price: 0.25, currency: 'USD', type: 'diamonds', game: 'mlbb', image: 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG' },
  { id: 2, name: '22 Diamonds', diamonds: 22, price: 0.50, currency: 'USD', type: 'diamonds', game: 'mlbb', image: 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG' },
  { id: 3, name: '56 Diamonds', diamonds: 56, price: 0.90, currency: 'USD', type: 'diamonds', game: 'mlbb', image: 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG' },
  // ... other products
];

export const FF_PRODUCTS_REFERENCE: GameProduct[] = [
  { id: 1, name: '25 Diamonds', diamonds: 25, price: 0.25, currency: 'USD', type: 'diamonds', game: 'freefire', image: 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp' },
  { id: 2, name: '100 Diamonds', diamonds: 100, price: 0.95, currency: 'USD', type: 'diamonds', game: 'freefire', image: 'https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/ztbz5tXMO2NOQ95.webp' },
  // ... other products
];