// Modern Tauri v2 file operations using standard plugins
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import Papa from 'papaparse';
import { CSVData, Player } from './types';
import { CSV_COLUMNS, CSV_COLUMN_ORDER } from './config';
import { DebugLogger } from './debugLogger';

export class TauriFileOperations {
  private static instance: TauriFileOperations;
  private currentFilePath: string | null = null;

  private constructor() {}

  static getInstance(): TauriFileOperations {
    if (!TauriFileOperations.instance) {
      TauriFileOperations.instance = new TauriFileOperations();
    }
    return TauriFileOperations.instance;
  }

  // Use Tauri's dialog plugin to select a CSV file
  async selectCSVFile(): Promise<string | null> {
    try {
      console.log('🗂️ Opening file dialog with Tauri dialog plugin...');
      
      const result = await open({
        filters: [
          {
            name: 'CSV Files',
            extensions: ['csv']
          }
        ],
        multiple: false
      });

      if (typeof result === 'string') {
        console.log('✅ File selected:', result);
        this.currentFilePath = result;
        return result;
      } else {
        console.log('ℹ️ No file selected (user cancelled)');
        return null;
      }
    } catch (error) {
      console.error('❌ Error opening file dialog:', error);
      throw new Error(`Failed to open file dialog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Use Tauri's fs plugin to read and parse CSV file
  async loadCSVFile(filePath: string): Promise<CSVData> {
    const logger = DebugLogger.getInstance();
    
    try {
      await logger.initSession(`CSV Load: ${filePath}`);
      await logger.info(`Reading CSV file with Tauri fs plugin: ${filePath}`);
      
      // Read file content using Tauri's fs plugin
      const fileContent = await readTextFile(filePath);
      await logger.info(`File content read successfully, length: ${fileContent.length} characters`);
      
      // Log preview of file content (first 500 chars)
      const preview = fileContent.substring(0, 500).replace(/\n/g, '\\n');
      await logger.debug(`File content preview: ${preview}`);
      
      // Count total lines
      const totalLines = fileContent.split('\n').length;
      await logger.info(`Total lines in file: ${totalLines}`);
      
      // Parse CSV using PapaParse with enhanced logging
      const parseResult = await this.parseCSVContent(fileContent, filePath);
      await logger.info(`CSV parsed successfully - Players: ${parseResult.players.length}, Teams: ${parseResult.teams.length}`);
      
      return parseResult;
    } catch (error) {
      await logger.error('Failed to load CSV file', error);
      throw new Error(`Failed to load CSV file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Parse CSV content with comprehensive logging
  private async parseCSVContent(csvContent: string, _filePath: string): Promise<CSVData> {
    const logger = DebugLogger.getInstance();
    
    return new Promise((resolve, reject) => {
      logger.startSection('Papa.parse Configuration').then(async () => {
        const config = {
          header: true,
          skipEmptyLines: 'greedy' as const,
          transformHeader: (header: string) => header.trim(),
          dynamicTyping: false,
          fastMode: false
        };
        
        await logger.logObject('Papa.parse config', config);
        await logger.info('Starting Papa.parse...');

        Papa.parse(csvContent, {
          ...config,
          complete: async (results: any) => {
            try {
              await logger.info(`Papa.parse completed`);
              await logger.info(`Raw results.data length: ${results.data?.length || 0}`);
              await logger.info(`Parse errors: ${results.errors?.length || 0}`);
              await logger.info(`Parse meta info: ${JSON.stringify(results.meta)}`);
              
              // Log any parsing errors
              if (results.errors && results.errors.length > 0) {
                for (const error of results.errors) {
                  await logger.error(`Parse error: ${JSON.stringify(error)}`);
                }
              }

              // Check if we have data
              if (!results.data || results.data.length === 0) {
                await logger.error('No data returned from Papa.parse');
                throw new Error('No data found in CSV file');
              }

              await logger.info(`Processing ${results.data.length} rows...`);
              
              const players: Player[] = [];
              let rowIndex = 0;
              
              for (const row of results.data) {
                try {
                  // Log every 10th row processing for visibility
                  if (rowIndex % 10 === 0) {
                    await logger.debug(`Processing row ${rowIndex}: ${JSON.stringify(row)}`);
                  }
                  
                  const player: Player = {
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
                  };

                  // Validate required fields
                  if (!player.barcode) {
                    await logger.warn(`Row ${rowIndex}: Missing barcode, skipping`);
                    rowIndex++;
                    continue;
                  }

                  if (!player.team) {
                    await logger.warn(`Row ${rowIndex}: Missing team for barcode ${player.barcode}, skipping`);
                    rowIndex++;
                    continue;
                  }

                  players.push(player);
                  await logger.debug(`Row ${rowIndex}: Added player ${player.barcode} (${player.firstName} ${player.lastName}) to team ${player.team}`);
                  
                } catch (rowError) {
                  await logger.error(`Error processing row ${rowIndex}`, rowError);
                }
                rowIndex++;
              }

              await logger.info(`Successfully processed ${players.length} players from ${results.data.length} rows`);

              // Create lookup maps with logging
              await logger.info('Creating lookup maps...');
              const playersMap = new Map<string, Player>();
              const teamPlayersMap = new Map<string, Player[]>();
              const teams: string[] = [];

              for (const player of players) {
                try {
                  if (player.barcode) {
                    playersMap.set(player.barcode, player);
                  }

                  if (player.team) {
                    if (!teamPlayersMap.has(player.team)) {
                      teamPlayersMap.set(player.team, []);
                      teams.push(player.team);
                      await logger.info(`Found new team: ${player.team}`);
                    }
                    teamPlayersMap.get(player.team)!.push(player);
                  }
                } catch (mapError) {
                  await logger.error(`Error adding player ${player.barcode} to maps`, mapError);
                }
              }

              const finalTeams = [...new Set(teams)];
              await logger.info(`Final results: ${players.length} players, ${finalTeams.length} teams`);
              await logger.logObject('Teams found', finalTeams);
              
              // Log team player counts
              for (const team of finalTeams) {
                const teamPlayerCount = teamPlayersMap.get(team)?.length || 0;
                await logger.info(`Team "${team}": ${teamPlayerCount} players`);
              }

              const result = {
                players,
                teams: finalTeams,
                playersMap,
                teamPlayersMap,
              };

              resolve(result);
            } catch (error) {
              await logger.error('Error in Papa.parse complete callback', error);
              reject(error);
            }
          },
          error: async (error: any) => {
            await logger.error('Papa.parse error callback triggered', error);
            reject(error);
          }
        });
      });
    });
  }

  // Save CSV file using in-place row updates to preserve all original data
  async saveCSVFile(csvData: CSVData, filePath: string): Promise<void> {
    try {
      console.log('💾 Saving CSV file with in-place row updates to:', filePath);
      
      // Read the original file to preserve structure
      const originalContent = await readTextFile(filePath);
      const lines = originalContent.split('\n');
      
      if (lines.length === 0) {
        throw new Error('Empty CSV file');
      }
      
      // Parse header to get column positions
      const headerLine = lines[0];
      const columnMapping = this.parseColumnPositions(headerLine);
      
      console.log('📊 Column mapping created for', Object.keys(columnMapping).length, 'editable fields');
      
      // Update each modified player row in-place
      const updatedLines = [...lines];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse the current row
        const columns = this.parseCSVRow(line);
        if (columns.length === 0) continue;
        
        // Get the barcode from the row to find matching player
        const barcode = columns[columnMapping['Barcode Number']] || '';
        if (!barcode) continue;
        
        // Find the updated player data
        const updatedPlayer = csvData.playersMap.get(barcode);
        if (!updatedPlayer) continue;
        
        // Update only the columns we edit, preserve everything else
        const updatedRow = this.updateRowInPlace(columns, updatedPlayer, columnMapping);
        updatedLines[i] = updatedRow;
        
        console.log(`📝 Updated row for player ${barcode}`);
      }
      
      // Write the updated file
      const updatedContent = updatedLines.join('\n');
      await writeTextFile(filePath, updatedContent);
      
      console.log('✅ CSV file saved successfully with in-place row updates');
    } catch (error) {
      console.error('❌ Error saving CSV file:', error);
      throw new Error(`Failed to save CSV file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Parse CSV header to create column position mapping
  private parseColumnPositions(headerLine: string): { [columnName: string]: number } {
    const headers = this.parseCSVRow(headerLine);
    const mapping: { [columnName: string]: number } = {};
    
    headers.forEach((header, index) => {
      const cleanHeader = header.trim().replace(/"/g, '');
      mapping[cleanHeader] = index;
    });
    
    return mapping;
  }

  // Parse a single CSV row handling quoted values properly
  private parseCSVRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
        i++;
        continue;
      } else {
        current += char;
      }
      
      i++;
    }
    
    // Add the last field
    result.push(current);
    
    return result;
  }

  // Update specific columns in a row while preserving all other data and original formatting
  private updateRowInPlace(
    originalColumns: string[], 
    updatedPlayer: Player, 
    columnMapping: { [columnName: string]: number }
  ): string {
    const columns = [...originalColumns]; // Copy to avoid mutation
    
    // Update only the fields we edit in the application
    const firstNameIndex = columnMapping['First Name'];
    const lastNameIndex = columnMapping['Last Name'];
    const cellPhoneIndex = columnMapping['Cell Phone'];
    const emailIndex = columnMapping['Email'];
    const coachIndex = columnMapping['Coach'];
    const productsIndex = columnMapping['Products'];
    const packagesIndex = columnMapping['Packages'];
    
    // Update name fields (parsed from the combined name)
    if (firstNameIndex !== undefined && firstNameIndex >= 0) {
      columns[firstNameIndex] = updatedPlayer.firstName || '';
    }
    if (lastNameIndex !== undefined && lastNameIndex >= 0) {
      columns[lastNameIndex] = updatedPlayer.lastName || '';
    }
    
    // Update contact fields
    if (cellPhoneIndex !== undefined && cellPhoneIndex >= 0) {
      columns[cellPhoneIndex] = updatedPlayer.cellPhone || '';
    }
    if (emailIndex !== undefined && emailIndex >= 0) {
      columns[emailIndex] = updatedPlayer.email || '';
    }
    
    // Update coach field
    if (coachIndex !== undefined && coachIndex >= 0) {
      columns[coachIndex] = updatedPlayer.coach || 'N';
    }
    
    // Update order fields - handle quoting for comma-separated values
    if (productsIndex !== undefined && productsIndex >= 0) {
      const productsValue = updatedPlayer.products || '';
      columns[productsIndex] = productsValue.includes(',') ? `"${productsValue}"` : productsValue;
    }
    if (packagesIndex !== undefined && packagesIndex >= 0) {
      const packagesValue = updatedPlayer.packages || '';
      columns[packagesIndex] = packagesValue.includes(',') ? `"${packagesValue}"` : packagesValue;
    }
    
    // Rebuild the CSV row preserving original quoting for unchanged fields
    return columns.map((field, index) => {
      const value = field.toString();
      
      // For order fields (products/packages), we handle quoting above
      if (index === productsIndex || index === packagesIndex) {
        return value; // Already properly quoted above if needed
      }
      
      // For other fields, only quote if they contain special characters
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }

  // Get current file path
  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  // Clear current file path
  clearCurrentFile(): void {
    this.currentFilePath = null;
  }

  // Utility function to clean up corrupted CSV files with duplicated columns
  async cleanupCorruptedCSV(filePath: string): Promise<void> {
    try {
      console.log('🧹 Cleaning up corrupted CSV file:', filePath);
      
      // Read the corrupted file
      const fileContent = await readTextFile(filePath);
      const lines = fileContent.split('\n');
      
      if (lines.length === 0) {
        throw new Error('Empty CSV file');
      }
      
      // Parse the header to identify corrupted columns
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
      
      console.log('📊 Original headers found:', headers.length);
      console.log('🎯 Expected headers:', CSV_COLUMN_ORDER.length);
      
      // Check if file has the corrupted duplicate structure
      const hasDuplicateStructure = headers.some(header => 
        ['barcode', 'team', 'firstName', 'lastName'].includes(header.toLowerCase())
      );
      
      if (!hasDuplicateStructure) {
        console.log('✅ CSV file appears to be clean (no duplicate structure detected)');
        return;
      }
      
      console.log('🔍 Corrupted structure detected, cleaning up...');
      
      // Map old headers to new headers and identify which columns to keep
      const columnMapping: number[] = [];
      
      for (const expectedHeader of CSV_COLUMN_ORDER) {
        const columnIndex = headers.findIndex(header => 
          header === expectedHeader || 
          // Handle common variations
          (expectedHeader === 'Barcode Number' && header.toLowerCase().includes('barcode')) ||
          (expectedHeader === 'Team' && header.toLowerCase() === 'team') ||
          (expectedHeader === 'First Name' && header.toLowerCase().includes('first')) ||
          (expectedHeader === 'Last Name' && header.toLowerCase().includes('last'))
        );
        
        columnMapping.push(columnIndex !== -1 ? columnIndex : -1);
      }
      
      // Rebuild the CSV with correct structure
      const cleanedLines: string[] = [];
      
      // Add correct header
      cleanedLines.push(CSV_COLUMN_ORDER.join(','));
      
      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',').map(col => col.trim());
        const cleanedRow: string[] = [];
        
        // Map each column according to our mapping
        for (const originalIndex of columnMapping) {
          if (originalIndex !== -1 && originalIndex < columns.length) {
            cleanedRow.push(columns[originalIndex]);
          } else {
            cleanedRow.push(''); // Empty value for missing columns
          }
        }
        
        cleanedLines.push(cleanedRow.join(','));
      }
      
      // Write the cleaned CSV back to the file
      const cleanedContent = cleanedLines.join('\n');
      await writeTextFile(filePath, cleanedContent);
      
      console.log('✅ CSV file cleaned up successfully');
      console.log(`📊 Processed ${cleanedLines.length - 1} data rows with ${CSV_COLUMN_ORDER.length} columns`);
      
    } catch (error) {
      console.error('❌ Error cleaning up corrupted CSV:', error);
      throw new Error(`Failed to cleanup corrupted CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}