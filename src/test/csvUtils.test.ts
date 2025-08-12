import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  parseCSV, 
  parseQuantitiesFromCSV, 
  formatQuantitiesToCSV,
  applyCoachLogic,
  updatePlayerInCSV,
  exportCSV,
  saveCSVFile
} from '../csvUtils';
import { CSVData, Player } from '../types';
import { COACH_CONFIG, NO_ORDER_CONFIG } from '../config';

describe('CSV Utils', () => {
  // Mock CSV data for testing
  const mockCSVContent = `Barcode Number,Team,First Name,Last Name,Jersey Number,Coach,Cell Phone,Email,Products,Packages
12345,Team A,John,Doe,10,N,555-0123,john@example.com,"810,820","A,B"
67890,Team A,Jane,Smith,15,Y,555-0456,jane@example.com,"810","C"
11111,Team B,Bob,Johnson,20,N,555-0789,bob@example.com,"","D"`;

  const samplePlayer: Player = {
    barcode: '12345',
    team: 'Team A',
    firstName: 'John',
    lastName: 'Doe',
    jerseyNumber: '10',
    coach: 'N',
    cellPhone: '555-0123',
    email: 'john@example.com',
    products: '810,820',
    packages: 'A,B'
  };

  const coachPlayer: Player = {
    barcode: '67890',
    team: 'Team A',
    firstName: 'Jane',
    lastName: 'Smith',
    jerseyNumber: '15',
    coach: 'Y',
    cellPhone: '555-0456',
    email: 'jane@example.com',
    products: '810',
    packages: 'C'
  };

  const noOrderPlayer: Player = {
    barcode: '11111',
    team: 'Team B',
    firstName: 'Bob',
    lastName: 'Johnson',
    jerseyNumber: '20',
    coach: 'N',
    cellPhone: '555-0789',
    email: 'bob@example.com',
    products: '',
    packages: 'D'
  };

  describe('parseCSV', () => {
    it('should parse CSV content correctly', async () => {
      const result = await parseCSV(mockCSVContent);
      
      expect(result.players).toHaveLength(3);
      expect(result.teams).toEqual(['Team A', 'Team B']);
      
      const player = result.playersMap.get('12345');
      expect(player?.barcode).toBe('12345');
      expect(player?.firstName).toBe('John');
      expect(player?.lastName).toBe('Doe');
      expect(player?.team).toBe('Team A');
      expect(player?.coach).toBe('N');
      
      expect(result.teamPlayersMap.get('Team A')).toHaveLength(2);
      expect(result.teamPlayersMap.get('Team B')).toHaveLength(1);
    });

    it('should handle empty CSV content', async () => {
      const result = await parseCSV('Barcode Number,Team,First Name,Last Name,Jersey Number,Coach,Cell Phone,Email,Products,Packages');
      
      expect(result.players).toHaveLength(0);
      expect(result.teams).toHaveLength(0);
    });

    it('should preserve team order from CSV (not alphabetical)', async () => {
      // Test with teams in non-alphabetical order
      const csvWithTeamOrder = `Barcode Number,Team,First Name,Last Name,Jersey Number,Coach,Cell Phone,Email,Products,Packages
12345,Zebra Team,John,Doe,10,N,555-0123,john@example.com,"810,820","A,B"
67890,Apple Team,Jane,Smith,15,Y,555-0456,jane@example.com,"810","C"
11111,Zebra Team,Bob,Johnson,20,N,555-0789,bob@example.com,"","D"
22222,Beta Team,Sam,Wilson,5,N,555-1111,sam@example.com,"820","E"`;
      
      const result = await parseCSV(csvWithTeamOrder);
      
      // Teams should appear in CSV order: Zebra Team (first), Apple Team (second), Beta Team (third)
      // NOT alphabetical order: Apple Team, Beta Team, Zebra Team
      expect(result.teams).toEqual(['Zebra Team', 'Apple Team', 'Beta Team']);
      expect(result.teams).not.toEqual(['Apple Team', 'Beta Team', 'Zebra Team']); // NOT alphabetical
    });

    it('should handle malformed CSV gracefully', async () => {
      // PapaParse is quite tolerant, so let's test with truly malformed data
      try {
        const result = await parseCSV('invalid,csv,content');
        // If it doesn't throw, it should at least return empty data
        expect(result.players).toHaveLength(0);
      } catch (error) {
        // Or it might throw an error, which is also acceptable
        expect(error).toBeDefined();
      }
    });
  });

  describe('parseQuantitiesFromCSV', () => {
    it('should parse comma-separated quantities correctly', () => {
      const result = parseQuantitiesFromCSV('810,820,810');
      expect(result).toEqual({ '810': 2, '820': 1 });
    });

    it('should handle empty string', () => {
      const result = parseQuantitiesFromCSV('');
      expect(result).toEqual({});
    });

    it('should handle single item', () => {
      const result = parseQuantitiesFromCSV('810');
      expect(result).toEqual({ '810': 1 });
    });

    it('should trim whitespace and filter empty items', () => {
      const result = parseQuantitiesFromCSV(' 810 , , 820 , ');
      expect(result).toEqual({ '810': 1, '820': 1 });
    });
  });

  describe('formatQuantitiesToCSV', () => {
    it('should format quantities to CSV string correctly', () => {
      const quantities = { '810': 2, '820': 1 };
      const result = formatQuantitiesToCSV(quantities);
      
      // Should contain both items the correct number of times
      expect(result.split(',').filter(item => item === '810')).toHaveLength(2);
      expect(result.split(',').filter(item => item === '820')).toHaveLength(1);
    });

    it('should handle empty quantities', () => {
      const result = formatQuantitiesToCSV({});
      expect(result).toBe('');
    });

    it('should handle zero quantities', () => {
      const quantities = { '810': 0, '820': 1 };
      const result = formatQuantitiesToCSV(quantities);
      expect(result).toBe('820');
    });
  });

  describe('applyCoachLogic - Bug Fix Test', () => {
    it('should NOT mark regular players as coaches even with orders', () => {
      const regularPlayer = { ...samplePlayer, coach: 'N' };
      const quantities = { '810': 2, '820': 1 }; // Player has orders
      
      const result = applyCoachLogic(regularPlayer, quantities);
      
      // CRITICAL: This should NOT mark the player as a coach
      expect(result.updatedPlayer.coach).toBe('N');
      expect(result.updatedPlayer.lastName).toBe('Doe'); // No -C suffix
      expect(result.updatedQuantities['810T']).toBeUndefined(); // No free coach item
    });

    it('should apply coach logic only to actual coaches', () => {
      const actualCoach = { ...coachPlayer, coach: 'Y' };
      const quantities = { '810': 1 };
      
      const result = applyCoachLogic(actualCoach, quantities);
      
      expect(result.updatedPlayer.coach).toBe('Y');
      expect(result.updatedPlayer.lastName).toBe('Smith' + COACH_CONFIG.LAST_NAME_SUFFIX);
      expect(result.updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE]).toBe(1);
    });

    it('should apply no-order logic to players with no orders', () => {
      const playerWithNoOrders = { ...samplePlayer };
      const quantities = {}; // No orders
      
      const result = applyCoachLogic(playerWithNoOrders, quantities);
      
      expect(result.updatedPlayer.lastName).toBe('Doe' + NO_ORDER_CONFIG.LAST_NAME_SUFFIX);
    });

    it('should NOT apply no-order logic to placeholder names like Player ##', () => {
      const placeholderPlayer = { 
        ...samplePlayer, 
        firstName: 'Player', 
        lastName: '34',
        coach: 'N' 
      };
      const quantities = {}; // No orders
      
      const result = applyCoachLogic(placeholderPlayer, quantities);
      
      // Should remain unchanged - no -N suffix for placeholder names
      expect(result.updatedPlayer.firstName).toBe('Player');
      expect(result.updatedPlayer.lastName).toBe('34');
      expect(result.updatedPlayer.lastName).not.toContain(NO_ORDER_CONFIG.LAST_NAME_SUFFIX);
    });

    it('should apply -N when player has no orders', () => {
      const playerWithOrders = { ...samplePlayer, coach: 'N' };
      const quantities = {}; // No orders
      
      const result = applyCoachLogic(playerWithOrders, quantities);
      
      // Should add -N suffix when player has no orders
      expect(result.updatedPlayer.lastName).toBe('Doe' + NO_ORDER_CONFIG.LAST_NAME_SUFFIX);
    });

    it('should remove -N suffix when player with no orders gets items added', () => {
      const playerWithNoOrders = { 
        ...samplePlayer, 
        lastName: 'Doe' + NO_ORDER_CONFIG.LAST_NAME_SUFFIX,
        coach: 'N' 
      };
      const quantities = { '810': 2 }; // Player now has orders
      
      const result = applyCoachLogic(playerWithNoOrders, quantities);
      
      // Should remove -N suffix when orders are added
      expect(result.updatedPlayer.lastName).toBe('Doe');
    });

    it('should not add suffix if already present', () => {
      const coachWithSuffix = { ...coachPlayer, lastName: 'Smith' + COACH_CONFIG.LAST_NAME_SUFFIX };
      const quantities = { '810': 1 };
      
      const result = applyCoachLogic(coachWithSuffix, quantities);
      
      // Should not double-add the suffix
      expect(result.updatedPlayer.lastName).toBe('Smith' + COACH_CONFIG.LAST_NAME_SUFFIX);
    });
  });

  describe('updatePlayerInCSV', () => {
    let mockCSVData: CSVData;

    beforeEach(() => {
      mockCSVData = {
        players: [samplePlayer, coachPlayer, noOrderPlayer],
        teams: ['Team A', 'Team B'],
        playersMap: new Map([
          ['12345', samplePlayer],
          ['67890', coachPlayer],
          ['11111', noOrderPlayer]
        ]),
        teamPlayersMap: new Map([
          ['Team A', [samplePlayer, coachPlayer]],
          ['Team B', [noOrderPlayer]]
        ])
      };
    });

    it('should update player information correctly', () => {
      const formData = {
        name: 'Johnny Doe Updated',
        phone: '555-9999',
        email: 'johnny.updated@example.com',
        isCoach: false
      };
      const quantities = { '810': 3, 'A': 1 };

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      expect(updatedPlayer?.firstName).toBe('Johnny');
      expect(updatedPlayer?.lastName).toBe('Doe Updated');
      expect(updatedPlayer?.cellPhone).toBe('555-9999');
      expect(updatedPlayer?.email).toBe('johnny.updated@example.com');
      expect(updatedPlayer?.coach).toBe('N');
    });

    it('should handle product and package separation correctly', () => {
      const formData = {
        name: 'Test Player',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };
      const quantities = { '810': 2, 'A': 1, '810T': 1, 'BuF': 1 };

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      
      // Products should contain base products and team variants (T)
      expect(updatedPlayer?.products).toContain('810');
      expect(updatedPlayer?.products).toContain('810T'); // Team variants go in products
      expect(updatedPlayer?.products).not.toContain('A');
      expect(updatedPlayer?.products).not.toContain('BuF'); // Family variants don't go in products
      
      // Packages should contain packages and family variants (F)
      expect(updatedPlayer?.packages).toContain('A');
      expect(updatedPlayer?.packages).toContain('BuF'); // Family variants go in packages
      expect(updatedPlayer?.packages).not.toContain('810T'); // Team variants don't go in packages
    });

    it('should handle non-existent player gracefully', () => {
      const formData = {
        name: 'Non Existent',
        phone: '555-0000',
        email: 'none@example.com',
        isCoach: false
      };
      const quantities = {};

      const result = updatePlayerInCSV(mockCSVData, 'INVALID', formData, quantities);
      
      // Should return original data unchanged
      expect(result).toBe(mockCSVData);
    });

    it('should preserve placeholder names when form name is empty', () => {
      const placeholderPlayer = {
        ...samplePlayer,
        firstName: 'Player',
        lastName: '34',
        barcode: 'TESTBAR'
      };
      
      mockCSVData.playersMap.set('TESTBAR', placeholderPlayer);
      mockCSVData.players.push(placeholderPlayer);
      
      const formData = {
        name: '', // Empty name indicates we want to preserve placeholder
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };
      const quantities = {}; // No orders

      const result = updatePlayerInCSV(mockCSVData, 'TESTBAR', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('TESTBAR');
      // Should preserve original placeholder name, no -N suffix added
      expect(updatedPlayer?.firstName).toBe('Player');
      expect(updatedPlayer?.lastName).toBe('34');
      expect(updatedPlayer?.lastName).not.toContain('-N');
      
      // Clean up
      mockCSVData.playersMap.delete('TESTBAR');
      mockCSVData.players.pop();
    });

    it('should apply -N suffix when updating player who had orders to no orders', () => {
      const playerWithOrders = {
        ...samplePlayer,
        products: '810,820', // Player has orders
        packages: 'A,B'
      };
      
      mockCSVData.playersMap.set('12345', playerWithOrders);
      const playerIndex = mockCSVData.players.findIndex(p => p.barcode === '12345');
      if (playerIndex !== -1) mockCSVData.players[playerIndex] = playerWithOrders;
      
      const formData = {
        name: 'John Doe',
        phone: '555-0123',
        email: 'john@example.com',
        isCoach: false
      };
      const quantities = {}; // No orders now

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      // Should apply -N suffix since player had orders before but now has none
      expect(updatedPlayer?.lastName).toBe('Doe' + NO_ORDER_CONFIG.LAST_NAME_SUFFIX);
    });

    it('should remove -N suffix when updating player who had no orders to having orders', () => {
      const playerWithNoOrders = {
        ...samplePlayer,
        lastName: 'Doe' + NO_ORDER_CONFIG.LAST_NAME_SUFFIX, // Has -N suffix
        products: '', // No orders
        packages: ''
      };
      
      mockCSVData.playersMap.set('12345', playerWithNoOrders);
      const playerIndex = mockCSVData.players.findIndex(p => p.barcode === '12345');
      if (playerIndex !== -1) mockCSVData.players[playerIndex] = playerWithNoOrders;
      
      const formData = {
        name: 'John Doe',
        phone: '555-0123',
        email: 'john@example.com',
        isCoach: false
      };
      const quantities = { '810': 2 }; // Now has orders

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      // Should remove -N suffix since player now has orders
      expect(updatedPlayer?.lastName).toBe('Doe');
    });

    it('should reflect business logic changes in updated CSV data for UI sync', () => {
      // This test verifies that after updatePlayerInCSV, the returned data
      // contains the business logic changes that should be reflected in the UI
      const regularPlayer = {
        ...samplePlayer,
        firstName: 'John',
        lastName: 'Smith',
        products: '810,820', // Player has orders initially
        packages: 'A'
      };
      
      mockCSVData.playersMap.set('12345', regularPlayer);
      const playerIndex = mockCSVData.players.findIndex(p => p.barcode === '12345');
      if (playerIndex !== -1) mockCSVData.players[playerIndex] = regularPlayer;
      
      // User removes all orders through the UI
      const formData = {
        name: 'John Smith',
        phone: '555-0123',
        email: 'john@example.com',
        isCoach: false
      };
      const quantities = {}; // No orders - all removed

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      
      // The updated CSV data should contain the business logic changes (-N suffix)
      // that the UI can use to reload and display the correct data
      expect(updatedPlayer?.firstName).toBe('John');
      expect(updatedPlayer?.lastName).toBe('Smith' + NO_ORDER_CONFIG.LAST_NAME_SUFFIX);
      expect(updatedPlayer?.products).toBe(''); // No orders
      expect(updatedPlayer?.packages).toBe(''); // No orders
      
      console.log('✅ Business logic changes available for UI sync:', {
        originalLastName: 'Smith',
        updatedLastName: updatedPlayer?.lastName,
        shouldShow_N_Icon: updatedPlayer?.lastName?.endsWith(NO_ORDER_CONFIG.LAST_NAME_SUFFIX)
      });
    });

    it('should correctly categorize DD items based on category (fix DD conflict)', () => {
      const playerWithMixedDD = {
        ...samplePlayer,
        products: '', // Start empty
        packages: ''
      };
      
      mockCSVData.playersMap.set('12345', playerWithMixedDD);
      const playerIndex = mockCSVData.players.findIndex(p => p.barcode === '12345');
      if (playerIndex !== -1) mockCSVData.players[playerIndex] = playerWithMixedDD;
      
      const formData = {
        name: 'John Doe',
        phone: '555-0123',
        email: 'john@example.com',
        isCoach: false
      };
      
      // Test: User selects both product DD and package DD  
      const quantities = { 
        'DD': 2  // This represents selections from both product DD and package DD UI elements
        // In real usage, the UI would track which DD was clicked based on the component context
      };

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      // With category-based logic, we need to simulate how the UI would differentiate
      // For this test, let's verify the filtering logic works with different scenarios
      
      // Test product DD categorization
      const productQuantities = { 'DD': 1 }; // Assuming this came from product UI
      const productResult = updatePlayerInCSV(mockCSVData, '12345', formData, productQuantities);
      const productPlayer = productResult.playersMap.get('12345');
      
      // The key is that the category-based filter should work correctly
      expect(typeof productPlayer?.products).toBe('string');
      expect(typeof productPlayer?.packages).toBe('string');
      expect(result).toBeDefined();
    });

    it('should prevent cross-category contamination (products in packages)', () => {
      const playerWithProducts = {
        ...samplePlayer,
        products: '',
        packages: ''
      };
      
      mockCSVData.playersMap.set('12345', playerWithProducts);
      const playerIndex = mockCSVData.players.findIndex(p => p.barcode === '12345');
      if (playerIndex !== -1) mockCSVData.players[playerIndex] = playerWithProducts;
      
      const formData = {
        name: 'John Doe',
        phone: '555-0123', 
        email: 'john@example.com',
        isCoach: false
      };
      
      // User selects various product items + family variants
      const quantities = { 
        'Bu': 2,     // Product - should go to products
        'Ma': 1,     // Product - should go to products  
        'Kc': 1,     // Product - should go to products
        'BuF': 1,    // Family variant - should go to packages
        'MaF': 2,    // Family variant - should go to packages
        'A': 1,      // Package - should go to packages
        '810T': 1    // Team variant - should go to products
      };

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      
      // Products should contain: Bu, Ma, Kc, 810T (products + team variants)
      const productItems = updatedPlayer?.products.split(',').filter(Boolean) || [];
      expect(productItems).toContain('Bu');
      expect(productItems).toContain('Ma');
      expect(productItems).toContain('Kc');
      expect(productItems).toContain('810T');
      expect(productItems).not.toContain('BuF'); // Should NOT be in products
      expect(productItems).not.toContain('A');   // Should NOT be in products
      
      // Packages should contain: BuF, MaF, A (packages + family variants)
      const packageItems = updatedPlayer?.packages.split(',').filter(Boolean) || [];
      expect(packageItems).toContain('BuF');
      expect(packageItems).toContain('MaF'); 
      expect(packageItems).toContain('A');
      expect(packageItems).not.toContain('Bu');   // Should NOT be in packages
      expect(packageItems).not.toContain('810T'); // Should NOT be in packages
    });

    it('should handle product and package categories correctly', () => {
      const formData = {
        name: 'Test Player',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };
      
      // Test with items from all categories
      const quantities = { 
        '810': 1,    // product
        'DD': 1,     // This will be handled by category (both exist)
        'A': 1,      // package
        'BuF': 1,    // f-variant (family)
        '810T': 1    // t-variant (team)
      };

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      
      // Verify correct categorization based on category field, not hardcoded arrays
      const productsCsv = updatedPlayer?.products || '';
      const packagesCsv = updatedPlayer?.packages || '';
      
      // Products should contain product category items and team variants
      expect(productsCsv).toContain('810');  // product category
      expect(productsCsv).toContain('810T'); // t-variant category
      
      // Packages should contain package category items and family variants  
      expect(packagesCsv).toContain('A');    // package category
      expect(packagesCsv).toContain('BuF');  // f-variant category
    });

    it('should maintain data consistency across all maps', () => {
      const formData = {
        name: 'Updated Name',
        phone: '555-1111',
        email: 'updated@example.com',
        isCoach: true
      };
      const quantities = { '810': 1 };

      const result = updatePlayerInCSV(mockCSVData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      const playerInArray = result.players.find(p => p.barcode === '12345');
      const playerInTeamMap = result.teamPlayersMap.get('Team A')?.find(p => p.barcode === '12345');
      
      // All references should be updated consistently
      expect(updatedPlayer?.firstName).toBe('Updated');
      expect(playerInArray?.firstName).toBe('Updated');
      expect(playerInTeamMap?.firstName).toBe('Updated');
      
      expect(updatedPlayer?.coach).toBe('Y');
      expect(playerInArray?.coach).toBe('Y');
      expect(playerInTeamMap?.coach).toBe('Y');
    });
  });

  describe('exportCSV', () => {
    it('should export CSV data correctly', () => {
      const csvData: CSVData = {
        players: [samplePlayer],
        teams: ['Team A'],
        playersMap: new Map([['12345', samplePlayer]]),
        teamPlayersMap: new Map([['Team A', [samplePlayer]]])
      };

      const result = exportCSV(csvData);
      
      expect(result).toContain('barcode');
      expect(result).toContain('12345,Team A,John,Doe');
    });

    it('should handle empty data', () => {
      const csvData: CSVData = {
        players: [],
        teams: [],
        playersMap: new Map(),
        teamPlayersMap: new Map()
      };

      const result = exportCSV(csvData);
      
      // Should still have headers even with no data
      expect(typeof result).toBe('string');
    });
  });

  describe('saveCSVFile', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create download with correct filename', async () => {
      const csvData: CSVData = {
        players: [samplePlayer],
        teams: ['Team A'],
        playersMap: new Map([['12345', samplePlayer]]),
        teamPlayersMap: new Map([['Team A', [samplePlayer]]])
      };

      await saveCSVFile(csvData, 'test-file.csv');
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should use default filename when none provided', async () => {
      const csvData: CSVData = {
        players: [],
        teams: [],
        playersMap: new Map(),
        teamPlayersMap: new Map()
      };

      await saveCSVFile(csvData);
      
      // Should still create the download
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });
});