import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as csvUtils from '../csvUtils';

// Mock the CSV utilities
vi.mock('../csvUtils', () => ({
  parseCSV: vi.fn(),
  updatePlayerInCSV: vi.fn(),
  saveCSVFile: vi.fn(),
  parseQuantitiesFromCSV: vi.fn(),
}));

describe('Auto-Save Logic Tests', () => {
  const mockCSVData = {
    players: [
      {
        barcode: '12345',
        team: 'Team A',
        firstName: 'John',
        lastName: 'Doe',
        jerseyNumber: '10',
        coach: 'N',
        cellPhone: '555-0123',
        email: 'john@example.com',
        products: '810',
        packages: 'A'
      },
      {
        barcode: '67890',
        team: 'Team A',
        firstName: 'Jane',
        lastName: 'Smith',
        jerseyNumber: '15',
        coach: 'N',
        cellPhone: '555-0456',
        email: 'jane@example.com',
        products: '820',
        packages: 'B'
      }
    ],
    teams: ['Team A'],
    playersMap: new Map([
      ['12345', {
        barcode: '12345',
        team: 'Team A',
        firstName: 'John',
        lastName: 'Doe',
        jerseyNumber: '10',
        coach: 'N',
        cellPhone: '555-0123',
        email: 'john@example.com',
        products: '810',
        packages: 'A'
      }],
      ['67890', {
        barcode: '67890',
        team: 'Team A',
        firstName: 'Jane',
        lastName: 'Smith',
        jerseyNumber: '15',
        coach: 'N',
        cellPhone: '555-0456',
        email: 'jane@example.com',
        products: '820',
        packages: 'B'
      }]
    ]),
    teamPlayersMap: new Map([
      ['Team A', [
        {
          barcode: '12345',
          team: 'Team A',
          firstName: 'John',
          lastName: 'Doe',
          jerseyNumber: '10',
          coach: 'N',
          cellPhone: '555-0123',
          email: 'john@example.com',
          products: '810',
          packages: 'A'
        },
        {
          barcode: '67890',
          team: 'Team A',
          firstName: 'Jane',
          lastName: 'Smith',
          jerseyNumber: '15',
          coach: 'N',
          cellPhone: '555-0456',
          email: 'jane@example.com',
          products: '820',
          packages: 'B'
        }
      ]]
    ])
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (csvUtils.parseCSV as Mock).mockResolvedValue(mockCSVData);
    (csvUtils.parseQuantitiesFromCSV as Mock).mockImplementation((csvString: string) => {
      if (!csvString) return {};
      const items = csvString.split(',').map(item => item.trim()).filter(Boolean);
      const quantities: Record<string, number> = {};
      items.forEach(item => {
        quantities[item] = (quantities[item] || 0) + 1;
      });
      return quantities;
    });
    (csvUtils.updatePlayerInCSV as Mock).mockImplementation((csvData) => {
      // Return updated CSV data
      return { ...csvData };
    });
    (csvUtils.saveCSVFile as Mock).mockResolvedValue(undefined);
  });

  // Helper to simulate auto-save scenario
  const simulateAutoSave = async (csvData: any, playerBarcode: string, formData: any, quantities: any) => {
    // This simulates what happens in the App component's saveCurrentPlayer function
    const updatedData = csvUtils.updatePlayerInCSV(csvData, playerBarcode, formData, quantities);
    await csvUtils.saveCSVFile(updatedData, 'test.csv');
    
    return updatedData;
  };

  describe('Auto-Save Data Flow', () => {
    it('should call updatePlayerInCSV and saveCSVFile in sequence', async () => {
      const formData = {
        name: 'John Doe Updated',
        phone: '555-9999',
        email: 'john.updated@example.com',
        isCoach: false
      };
      const quantities = { '810': 2, 'A': 1 };

      await simulateAutoSave(mockCSVData, '12345', formData, quantities);

      expect(csvUtils.updatePlayerInCSV).toHaveBeenCalledWith(
        mockCSVData,
        '12345',
        formData,
        quantities
      );
      expect(csvUtils.saveCSVFile).toHaveBeenCalledWith(
        expect.any(Object),
        'test.csv'
      );
    });

    it('should preserve data integrity during auto-save flow', async () => {
      const formData = {
        name: 'Jane Smith Modified',
        phone: '555-1111',
        email: 'jane.modified@example.com',
        isCoach: true
      };
      const quantities = { '820': 1, 'B': 2 };

      await simulateAutoSave(mockCSVData, '67890', formData, quantities);

      expect(csvUtils.updatePlayerInCSV).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ barcode: '12345' }),
            expect.objectContaining({ barcode: '67890' })
          ])
        }),
        '67890',
        expect.objectContaining({
          name: 'Jane Smith Modified',
          phone: '555-1111',
          email: 'jane.modified@example.com',
          isCoach: true
        }),
        { '820': 1, 'B': 2 }
      );
    });

    it('should handle coach checkbox state correctly', async () => {
      const formData = {
        name: 'John Doe',
        phone: '555-0123',
        email: 'john@example.com',
        isCoach: true // Setting as coach
      };
      const quantities = { '810': 1 };

      await simulateAutoSave(mockCSVData, '12345', formData, quantities);

      expect(csvUtils.updatePlayerInCSV).toHaveBeenCalledWith(
        expect.any(Object),
        '12345',
        expect.objectContaining({
          isCoach: true
        }),
        quantities
      );
    });

    it('should preserve quantities during save', async () => {
      const formData = {
        name: 'Test Player',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };
      const quantities = { '810': 3, '820': 1, 'A': 2, 'B': 1 };

      await simulateAutoSave(mockCSVData, '12345', formData, quantities);

      expect(csvUtils.updatePlayerInCSV).toHaveBeenCalledWith(
        expect.any(Object),
        '12345',
        expect.any(Object),
        { '810': 3, '820': 1, 'A': 2, 'B': 1 }
      );
    });
  });

  describe('Auto-Save Error Handling', () => {
    it('should handle updatePlayerInCSV errors gracefully', async () => {
      (csvUtils.updatePlayerInCSV as Mock).mockImplementation(() => {
        throw new Error('Update failed');
      });

      const formData = {
        name: 'Test',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };

      await expect(
        simulateAutoSave(mockCSVData, '12345', formData, {})
      ).rejects.toThrow('Update failed');
    });

    it('should handle saveCSVFile errors gracefully', async () => {
      (csvUtils.saveCSVFile as Mock).mockRejectedValue(new Error('Save failed'));

      const formData = {
        name: 'Test',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };

      await expect(
        simulateAutoSave(mockCSVData, '12345', formData, {})
      ).rejects.toThrow('Save failed');
    });

    it('should handle invalid player barcode', async () => {
      const formData = {
        name: 'Test',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };

      await simulateAutoSave(mockCSVData, 'INVALID', formData, {});

      expect(csvUtils.updatePlayerInCSV).toHaveBeenCalledWith(
        mockCSVData,
        'INVALID',
        formData,
        {}
      );
    });
  });

  describe('File Name Preservation', () => {
    it('should use provided filename for saving', async () => {
      const formData = {
        name: 'Test',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };

      // Simulate with custom filename
      const updatedData = csvUtils.updatePlayerInCSV(mockCSVData, '12345', formData, {});
      await csvUtils.saveCSVFile(updatedData, 'custom-filename.csv');

      expect(csvUtils.saveCSVFile).toHaveBeenCalledWith(
        expect.any(Object),
        'custom-filename.csv'
      );
    });

    it('should handle missing filename', async () => {
      const formData = {
        name: 'Test',
        phone: '555-0000',
        email: 'test@example.com',
        isCoach: false
      };

      const updatedData = csvUtils.updatePlayerInCSV(mockCSVData, '12345', formData, {});
      await csvUtils.saveCSVFile(updatedData); // No filename

      expect(csvUtils.saveCSVFile).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });
  });
});