// Rust backend interface for Tauri commands
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// Types matching Rust structs
export interface RustPlayer {
  barcode: string;
  team: string;
  first_name: string;
  last_name: string;
  jersey_number: string;
  coach: string;
  cell_phone: string;
  email: string;
  products: string;
  packages: string;
  other_fields: Record<string, string>;
}

export interface RustCSVData {
  players: RustPlayer[];
  teams: string[];
  file_path: string;
}

export interface RustPlayerUpdate {
  barcode: string;
  first_name: string;
  last_name: string;
  cell_phone: string;
  email: string;
  coach: string;
  products: string;
  packages: string;
}

// Convert frontend Player to Rust format
export function convertToRustPlayer(player: any): RustPlayer {
  return {
    barcode: player.barcode || '',
    team: player.team || '',
    first_name: player.firstName || '',
    last_name: player.lastName || '',
    jersey_number: player.jerseyNumber || '',
    coach: player.coach || 'N',
    cell_phone: player.cellPhone || '',
    email: player.email || '',
    products: player.products || '',
    packages: player.packages || '',
    other_fields: {
      'Team Image Number': player['Team Image Number'] || '',
      'Individual Image Number': player['Individual Image Number'] || '',
      'Alt 1': player['Alt 1'] || '',
      'Alt 2': player['Alt 2'] || '',
      'Alt 3': player['Alt 3'] || '',
      'Alt 4': player['Alt 4'] || '',
      'Alt 5': player['Alt 5'] || '',
      'Buddy Image Number': player['Buddy Image Number'] || '',
      'Parent Name': player['Parent Name'] || '',
      'Address1': player['Address1'] || '',
      'Address2': player['Address2'] || '',
      'City': player['City'] || '',
      'State': player['State'] || '',
      'Zip Code': player['Zip Code'] || '',
      'Country': player['Country'] || '',
      'Age': player['Age'] || '',
      'Grade': player['Grade'] || '',
      'Coach Name': player['Coach Name'] || '',
      'Feet': player['Feet'] || '',
      'Inches': player['Inches'] || '',
      'Weight': player['Weight'] || '',
      'Position': player['Position'] || '',
      'Favorite Pro': player['Favorite Pro'] || '',
      'Player Stat': player['Player Stat'] || '',
      'Additional Order': player['Additional Order'] || '',
      'Retouching': player['Retouching'] || '',
      'Glasses Glare': player['Glasses Glare'] || '',
    }
  };
}

// Convert Rust Player to frontend format
export function convertFromRustPlayer(rustPlayer: RustPlayer): any {
  return {
    barcode: rustPlayer.barcode,
    team: rustPlayer.team,
    firstName: rustPlayer.first_name,
    lastName: rustPlayer.last_name,
    jerseyNumber: rustPlayer.jersey_number,
    coach: rustPlayer.coach,
    cellPhone: rustPlayer.cell_phone,
    email: rustPlayer.email,
    products: rustPlayer.products,
    packages: rustPlayer.packages,
    ...rustPlayer.other_fields
  };
}

export class RustBackend {
  static async selectCSVFile(): Promise<string | null> {
    try {
      // Check if we're running in Tauri environment
      if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
        throw new Error('Tauri environment not available - please run with "bun run tauri dev"');
      }

      console.log('RustBackend: Attempting to open file dialog...');
      
      const result = await open({
        filters: [
          {
            name: 'CSV Files',
            extensions: ['csv']
          }
        ],
        multiple: false
      });
      
      console.log('RustBackend: File dialog returned:', result);
      
      if (typeof result === 'string') {
        console.log('RustBackend: File selected successfully:', result);
        return result;
      } else {
        console.log('RustBackend: No file selected (user cancelled)');
        return null;
      }
    } catch (error) {
      console.error('RustBackend: Error during file selection:', error);
      
      if (error instanceof Error) {
        console.error('RustBackend: Error name:', error.name);
        console.error('RustBackend: Error message:', error.message);
        console.error('RustBackend: Error stack:', error.stack);
      }
      
      throw new Error(`Failed to open file dialog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async loadCSV(filePath: string): Promise<RustCSVData> {
    return await invoke<RustCSVData>('load_csv', { filePath });
  }

  static async savePlayer(filePath: string, playerUpdate: RustPlayerUpdate): Promise<void> {
    return await invoke<void>('save_player', { filePath, playerUpdate });
  }

  static async createBackup(filePath: string): Promise<string> {
    return await invoke<string>('create_backup', { filePath });
  }

  static async writeCsvFile(filePath: string, csvContent: string): Promise<void> {
    return await invoke<void>('write_csv_file', { filePath, csvContent });
  }
}