// CSV utility functions for MVS Photo Form Filler
import Papa from 'papaparse';
import { Player, CSVData, OrderQuantities } from './types';
import { CSV_COLUMNS, COACH_CONFIG, NO_ORDER_CONFIG, PACKAGE_ITEMS, PRODUCT_ITEMS, FAMILY_ITEMS, TEAM_ITEMS, convertInternalQuantitiesToCSV } from './config';
import { isPlaceholderName } from './coachUtils';

// Create category-specific code sets to handle duplicate codes correctly
const PACKAGE_CODES = new Set(PACKAGE_ITEMS.map(item => item.code));
const PRODUCT_CODES = new Set(PRODUCT_ITEMS.map(item => item.code));
const FAMILY_CODES = new Set(FAMILY_ITEMS.map(item => item.code));
const TEAM_CODES = new Set(TEAM_ITEMS.map(item => item.code));

export function parseCSV(csvContent: string): Promise<CSVData> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const players: Player[] = results.data.map((row: any) => ({
            barcode: row[CSV_COLUMNS.BARCODE] || '',
            team: row[CSV_COLUMNS.TEAM] || '',
            firstName: row[CSV_COLUMNS.FIRST_NAME] || '',
            lastName: row[CSV_COLUMNS.LAST_NAME] || '',
            jerseyNumber: row[CSV_COLUMNS.JERSEY_NUMBER] || '',
            coach: row[CSV_COLUMNS.COACH] || 'N',
            cellPhone: row[CSV_COLUMNS.CELL_PHONE] || '',
            email: row[CSV_COLUMNS.EMAIL] || '',
            products: row[CSV_COLUMNS.PRODUCTS] || '',
            packages: row[CSV_COLUMNS.PACKAGES] || '',
            ...row, // Include all other CSV columns
          }));

          // Create lookup maps
          const playersMap = new Map<string, Player>();
          const teamPlayersMap = new Map<string, Player[]>();
          const teams: string[] = [];

          players.forEach(player => {
            if (player.barcode) {
              playersMap.set(player.barcode, player);
            }

            if (player.team) {
              if (!teamPlayersMap.has(player.team)) {
                teamPlayersMap.set(player.team, []);
                teams.push(player.team);
              }
              teamPlayersMap.get(player.team)!.push(player);
            }
          });

          resolve({
            players,
            teams: [...new Set(teams)],
            playersMap,
            teamPlayersMap,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
}

export function parseQuantitiesFromCSV(csvString: string): OrderQuantities {
  const quantities: OrderQuantities = {};
  
  if (!csvString) return quantities;

  const items = csvString.split(',').map(item => item.trim()).filter(Boolean);
  
  items.forEach(item => {
    quantities[item] = (quantities[item] || 0) + 1;
  });

  return quantities;
}

export function formatQuantitiesToCSV(quantities: OrderQuantities): string {
  const items: string[] = [];
  
  Object.entries(quantities).forEach(([itemCode, quantity]) => {
    for (let i = 0; i < quantity; i++) {
      items.push(itemCode);
    }
  });

  return items.join(',');
}

export function applyCoachLogic(
  player: Player, 
  quantities: OrderQuantities
): { 
  updatedPlayer: Player; 
  updatedQuantities: OrderQuantities;
} {
  const updatedPlayer = { ...player };
  const updatedQuantities = { ...quantities };

  if (player.coach === COACH_CONFIG.COACH_FIELD_VALUE) {
    // Apply coach logic only if they are actually a coach
    updatedPlayer.coach = COACH_CONFIG.COACH_FIELD_VALUE;
    
    // Add free 810T if coach doesn't already have at least one
    const currentCoachItems = updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE] || 0;
    if (currentCoachItems === 0) {
      updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE] = 1;
    }
    
    // Add -C suffix if not already present
    if (!updatedPlayer.lastName.endsWith(COACH_CONFIG.LAST_NAME_SUFFIX)) {
      updatedPlayer.lastName += COACH_CONFIG.LAST_NAME_SUFFIX;
    }
  } else if (Object.keys(quantities).length === 0) {
    // Apply no-order logic if:
    // 1. Player currently has no orders AND
    // 2. It's not a placeholder name like "Player 34" AND  
    // 3. Either they had orders before OR this is a new player with no orders
    const fullName = `${updatedPlayer.firstName} ${updatedPlayer.lastName}`.trim();
    if (!isPlaceholderName(fullName) && !updatedPlayer.lastName.endsWith(NO_ORDER_CONFIG.LAST_NAME_SUFFIX)) {
      // Apply -N suffix for players with no orders (including those who had orders removed)
      updatedPlayer.lastName += NO_ORDER_CONFIG.LAST_NAME_SUFFIX;
    }
  } else {
    // Player has orders - remove -N suffix if present (player went from no orders to having orders)
    if (updatedPlayer.lastName.endsWith(NO_ORDER_CONFIG.LAST_NAME_SUFFIX)) {
      updatedPlayer.lastName = updatedPlayer.lastName.slice(0, -NO_ORDER_CONFIG.LAST_NAME_SUFFIX.length);
    }
  }

  return { updatedPlayer, updatedQuantities };
}

export function updatePlayerInCSV(
  csvData: CSVData, 
  barcode: string, 
  formData: { name: string; phone: string; email: string; isCoach: boolean },
  quantities: OrderQuantities
): CSVData {
  const player = csvData.playersMap.get(barcode);
  if (!player) return csvData;

  // Parse name (split at first space) - but preserve original if form name is empty
  let firstName, lastName;
  if (formData.name.trim() === '') {
    // Keep original name if form is empty (indicating placeholder name should be preserved)
    firstName = player.firstName;
    lastName = player.lastName;
  } else {
    const nameParts = formData.name.trim().split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }

  // Create updated player
  const updatedPlayer: Player = {
    ...player,
    firstName,
    lastName,
    cellPhone: formData.phone,
    email: formData.email,
    coach: formData.isCoach ? COACH_CONFIG.COACH_FIELD_VALUE : 'N',
  };

  // Note: The logic for applying -N suffix now happens automatically in applyCoachLogic
  // based on current order quantities, which handles both new no-order players
  // and players who had their orders removed

  // Apply business logic
  const { updatedPlayer: finalPlayer, updatedQuantities } = 
    applyCoachLogic(updatedPlayer, quantities);

  // Update CSV strings - Filter by internal codes first, then convert to CSV format
  
  // Products column: Product items + Family variants + Team variants (everything except packages)
  const productQuantities = Object.fromEntries(
    Object.entries(updatedQuantities).filter(([code]) => {
      // Include all items except packages
      return PRODUCT_CODES.has(code) || FAMILY_CODES.has(code) || TEAM_CODES.has(code);
    })
  );
  
  // Packages column: Only the 9 package items (A, B, C, D, E, F, G, H, DDPa)
  const packageQuantities = Object.fromEntries(
    Object.entries(updatedQuantities).filter(([code]) => {
      // Include only packages
      return PACKAGE_CODES.has(code);
    })
  );
  
  // Convert each category to CSV format (DDPr→DD, DDPa→DD)
  const csvProductQuantities = convertInternalQuantitiesToCSV(productQuantities);
  const csvPackageQuantities = convertInternalQuantitiesToCSV(packageQuantities);
  
  // Format to CSV strings
  finalPlayer.products = formatQuantitiesToCSV(csvProductQuantities);
  finalPlayer.packages = formatQuantitiesToCSV(csvPackageQuantities);

  // Update data structures
  const newPlayersMap = new Map(csvData.playersMap);
  newPlayersMap.set(barcode, finalPlayer);

  const newPlayers = csvData.players.map(p => 
    p.barcode === barcode ? finalPlayer : p
  );

  const newTeamPlayersMap = new Map<string, Player[]>();
  csvData.teamPlayersMap.forEach((players, team) => {
    newTeamPlayersMap.set(
      team, 
      players.map(p => p.barcode === barcode ? finalPlayer : p)
    );
  });

  return {
    ...csvData,
    players: newPlayers,
    playersMap: newPlayersMap,
    teamPlayersMap: newTeamPlayersMap,
  };
}

export function exportCSV(csvData: CSVData): string {
  const headers = Object.keys(csvData.players[0] || {});
  const csvContent = Papa.unparse({
    fields: headers,
    data: csvData.players
  });
  
  return csvContent;
}

export async function saveCSVFile(csvData: CSVData, filePath?: string): Promise<void> {
  console.log('🔄 Desktop CSV save - this function is deprecated for desktop use');
  console.log('Use RustBackend.savePlayer() or RustBackend.writeCsvFile() instead');
  
  // For desktop apps, we should use Rust backend directly
  // This function is kept for compatibility but not recommended for desktop use
  if (filePath && filePath.includes('/') || filePath && filePath.includes('\\')) {
    // If we have a full path, try to use Rust backend
    try {
      const { RustBackend } = await import('./rustBackend');
      const csvContent = exportCSV(csvData);
      await RustBackend.writeCsvFile(filePath, csvContent);
      console.log('✅ CSV saved via Rust backend to:', filePath);
      return;
    } catch (error) {
      console.error('❌ Failed to save via Rust backend:', error);
    }
  }
  
  // Fallback: create download (not ideal for desktop)
  console.warn('⚠️ Using browser download fallback - not ideal for desktop apps');
  const csvContent = exportCSV(csvData);
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filePath || 'updated_data.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  console.log('✅ File downloaded as:', filePath || 'updated_data.csv');
}

// Desktop-specific save function using Rust backend
export async function saveCSVFileDesktop(csvData: CSVData, filePath: string): Promise<void> {
  try {
    const { RustBackend } = await import('./rustBackend');
    const csvContent = exportCSV(csvData);
    console.log('💾 Saving CSV file via Rust backend to:', filePath);
    await RustBackend.writeCsvFile(filePath, csvContent);
    console.log('✅ CSV file saved successfully via Rust backend');
  } catch (error) {
    console.error('❌ Failed to save CSV file via Rust backend:', error);
    throw error;
  }
}