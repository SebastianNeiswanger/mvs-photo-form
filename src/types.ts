// Type definitions for MVS Photo Form Filler

export interface Player {
  barcode: string;
  team: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  coach: string; // 'Y' or 'N'
  cellPhone: string;
  email: string;
  products: string; // comma-separated product codes
  packages: string; // comma-separated package codes
  [key: string]: string; // Allow for additional CSV columns
}

export interface ItemConfig {
  code: string;
  displayName: string;
  price: number;
  category: 'package' | 'product' | 'f-variant' | 't-variant';
  parentCode?: string; // For sub-products: reference to parent item code
  isSubProduct?: boolean; // Flag indicating this is a sub-product
}

export interface OrderQuantities {
  [itemCode: string]: number;
}

export interface FormData {
  name: string;
  phone: string;
  email: string;
  isCoach: boolean;
  quantities: OrderQuantities;
}

export interface CSVData {
  players: Player[];
  teams: string[];
  playersMap: Map<string, Player>; // barcode -> Player
  teamPlayersMap: Map<string, Player[]>; // team -> Player[]
}