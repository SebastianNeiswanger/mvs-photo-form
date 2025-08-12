// Configuration for MVS Photo Form Filler
import { ItemConfig } from './types';

// Package items (3x3 grid: A, B, C, D, E, F, G, H, DD)
export const PACKAGE_ITEMS: ItemConfig[] = [
  { code: 'A', displayName: 'Package A', price: 15, category: 'package' },
  { code: 'B', displayName: 'Package B', price: 20, category: 'package' },
  { code: 'C', displayName: 'Package C', price: 25, category: 'package' },
  { code: 'D', displayName: 'Package D', price: 35, category: 'package' },
  { code: 'E', displayName: 'Package E', price: 44, category: 'package' },
  { code: 'F', displayName: 'Package F', price: 53, category: 'package' },
  { code: 'G', displayName: 'Package G', price: 60, category: 'package' },
  { code: 'H', displayName: 'Package H', price: 45, category: 'package' },
  { code: 'DDPa', displayName: 'Digital Download', price: 30, category: 'package' },
];

// Product items (Column 2)
export const PRODUCT_ITEMS: ItemConfig[] = [
  { code: '57', displayName: '5x7 Individual', price: 9, category: 'product' },
  { code: '810', displayName: '8x10 Individual', price: 15, category: 'product' },
  { code: '23', displayName: '4 Wallets', price: 8, category: 'product' },
  { code: '23x8', displayName: '8 Wallets', price: 14, category: 'product' },
  { code: 'Bu', displayName: 'Button', price: 9, category: 'product' },
  { code: 'ABa', displayName: 'Acrylic Button', price: 9, category: 'product' },
  { code: 'Ma', displayName: 'Magnet', price: 9, category: 'product' },
  { code: 'AMa', displayName: 'Acrylic Magnet', price: 9, category: 'product' },
  { code: 'Kc', displayName: 'Keychain', price: 12, category: 'product' },
  { code: 'KcS', displayName: 'Keychain Statuette', price: 18, category: 'product' },
  { code: 'DDPr', displayName: 'Digital File', price: 20, category: 'product' },
];

// F (Family) Variant items (Column 3)
export const FAMILY_ITEMS: ItemConfig[] = [
  { code: '57F', displayName: '5x7 - Family', price: 11, category: 'f-variant' },
  { code: '810F', displayName: '8x10 - Family', price: 17, category: 'f-variant' },
  { code: '23F', displayName: '4 Wallets - Family', price: 10, category: 'f-variant' },
  { code: '23x8F', displayName: '8 Wallets - Family', price: 17, category: 'f-variant' },
  { code: 'BuF', displayName: 'Button - Family', price: 11, category: 'f-variant' },
  { code: 'ABuF', displayName: 'Acrylic Button - Family', price: 17, category: 'f-variant' },
  { code: 'MaF', displayName: 'Magnet - Family', price: 11, category: 'f-variant' },
  { code: 'AMaF', displayName: 'Acrylic Magnet - Family', price: 17, category: 'f-variant' },
  { code: 'KcF', displayName: 'Keychain - Family', price: 15, category: 'f-variant' },
  { code: 'KcSF', displayName: 'Keychain Statuette - Family', price: 23, category: 'f-variant' },
  { code: 'DDF', displayName: 'Digital File - Family', price: 25, category: 'f-variant' },
];

// T (Team) Variant items (Column 4)  
export const TEAM_ITEMS: ItemConfig[] = [
  { code: '57T', displayName: '5x7 - Team', price: 11, category: 't-variant' },
  { code: '810T', displayName: '8x10 - Team', price: 17, category: 't-variant' },
];

// Legacy combined variant items for backward compatibility
export const VARIANT_ITEMS: ItemConfig[] = [
  ...FAMILY_ITEMS,
  ...TEAM_ITEMS,
];

// All items combined for easy lookup
export const ALL_ITEMS: ItemConfig[] = [
  ...PACKAGE_ITEMS,
  ...PRODUCT_ITEMS,
  ...VARIANT_ITEMS,
];

// Create lookup maps for easy access
export const ITEMS_BY_CODE = new Map<string, ItemConfig>(
  ALL_ITEMS.map(item => [item.code, item])
);

// Coach-specific configuration
export const COACH_CONFIG = {
  FREE_ITEM_CODE: '810T',
  LAST_NAME_SUFFIX: '-C',
  COACH_FIELD_VALUE: 'Y',
};

// No-order player configuration  
export const NO_ORDER_CONFIG = {
  LAST_NAME_SUFFIX: '-N',
};

// DD Internal/CSV code conversion 
export const DD_CODE_CONVERSION = {
  // Internal codes to CSV codes
  INTERNAL_TO_CSV: {
    'DDPa': 'DD',  // Package DD
    'DDPr': 'DD'   // Product DD
  },
  // CSV codes to internal codes (requires column context)
  CSV_TO_INTERNAL: {
    packages: { 'DD': 'DDPa' },
    products: { 'DD': 'DDPr' }
  }
};

// Convert internal quantities to CSV format for saving
export function convertInternalQuantitiesToCSV(internalQuantities: { [key: string]: number }): { [key: string]: number } {
  const csvQuantities: { [key: string]: number } = {};
  
  for (const [internalCode, quantity] of Object.entries(internalQuantities)) {
    const csvCode = (DD_CODE_CONVERSION.INTERNAL_TO_CSV as { [key: string]: string })[internalCode] || internalCode;
    csvQuantities[csvCode] = (csvQuantities[csvCode] || 0) + quantity;
  }
  
  return csvQuantities;
}

// Convert CSV quantities to internal format when loading (requires column context)
export function convertCSVQuantitiesToInternal(
  productQuantities: { [key: string]: number }, 
  packageQuantities: { [key: string]: number }
): { [key: string]: number } {
  const internalQuantities: { [key: string]: number } = {};
  
  // Convert products column quantities
  for (const [csvCode, quantity] of Object.entries(productQuantities)) {
    const internalCode = (DD_CODE_CONVERSION.CSV_TO_INTERNAL.products as { [key: string]: string })[csvCode] || csvCode;
    internalQuantities[internalCode] = (internalQuantities[internalCode] || 0) + quantity;
  }
  
  // Convert packages column quantities  
  for (const [csvCode, quantity] of Object.entries(packageQuantities)) {
    const internalCode = (DD_CODE_CONVERSION.CSV_TO_INTERNAL.packages as { [key: string]: string })[csvCode] || csvCode;
    internalQuantities[internalCode] = (internalQuantities[internalCode] || 0) + quantity;
  }
  
  return internalQuantities;
}


// CSV column mappings - preserves original CSV structure
export const CSV_COLUMNS = {
  BARCODE: 'Barcode Number',
  TEAM: 'Team', 
  FIRST_NAME: 'First Name',
  LAST_NAME: 'Last Name',
  JERSEY_NUMBER: 'Jersey Number',
  COACH: 'Coach',
  TEAM_IMAGE_NUMBER: 'Team Image Number',
  INDIVIDUAL_IMAGE_NUMBER: 'Individual Image Number',
  ALT_1: 'Alt 1',
  ALT_2: 'Alt 2',
  ALT_3: 'Alt 3',
  ALT_4: 'Alt 4',
  ALT_5: 'Alt 5',
  BUDDY_IMAGE_NUMBER: 'Buddy Image Number',
  PARENT_NAME: 'Parent Name',
  ADDRESS1: 'Address1',
  ADDRESS2: 'Address2',
  CITY: 'City',
  STATE: 'State',
  ZIP_CODE: 'Zip Code',
  COUNTRY: 'Country',
  CELL_PHONE: 'Cell Phone',
  EMAIL: 'Email',
  AGE: 'Age',
  GRADE: 'Grade',
  COACH_NAME: 'Coach Name',
  FEET: 'Feet',
  INCHES: 'Inches',
  WEIGHT: 'Weight',
  POSITION: 'Position',
  FAVORITE_PRO: 'Favorite Pro',
  PLAYER_STAT: 'Player Stat',
  PRODUCTS: 'Products',
  PACKAGES: 'Packages',
  ADDITIONAL_ORDER: 'Additional Order',
  RETOUCHING: 'Retouching',
  GLASSES_GLARE: 'Glasses Glare',
} as const;

// Ordered list of all CSV columns (maintains original CSV structure)
export const CSV_COLUMN_ORDER = [
  CSV_COLUMNS.BARCODE,
  CSV_COLUMNS.TEAM,
  CSV_COLUMNS.FIRST_NAME,
  CSV_COLUMNS.LAST_NAME,
  CSV_COLUMNS.JERSEY_NUMBER,
  CSV_COLUMNS.COACH,
  CSV_COLUMNS.TEAM_IMAGE_NUMBER,
  CSV_COLUMNS.INDIVIDUAL_IMAGE_NUMBER,
  CSV_COLUMNS.ALT_1,
  CSV_COLUMNS.ALT_2,
  CSV_COLUMNS.ALT_3,
  CSV_COLUMNS.ALT_4,
  CSV_COLUMNS.ALT_5,
  CSV_COLUMNS.BUDDY_IMAGE_NUMBER,
  CSV_COLUMNS.PARENT_NAME,
  CSV_COLUMNS.ADDRESS1,
  CSV_COLUMNS.ADDRESS2,
  CSV_COLUMNS.CITY,
  CSV_COLUMNS.STATE,
  CSV_COLUMNS.ZIP_CODE,
  CSV_COLUMNS.COUNTRY,
  CSV_COLUMNS.CELL_PHONE,
  CSV_COLUMNS.EMAIL,
  CSV_COLUMNS.AGE,
  CSV_COLUMNS.GRADE,
  CSV_COLUMNS.COACH_NAME,
  CSV_COLUMNS.FEET,
  CSV_COLUMNS.INCHES,
  CSV_COLUMNS.WEIGHT,
  CSV_COLUMNS.POSITION,
  CSV_COLUMNS.FAVORITE_PRO,
  CSV_COLUMNS.PLAYER_STAT,
  CSV_COLUMNS.PRODUCTS,
  CSV_COLUMNS.PACKAGES,
  CSV_COLUMNS.ADDITIONAL_ORDER,
  CSV_COLUMNS.RETOUCHING,
  CSV_COLUMNS.GLASSES_GLARE,
];