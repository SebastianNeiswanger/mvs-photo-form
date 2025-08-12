import { describe, it, expect } from 'vitest';
import { applyCoachLogic, updatePlayerInCSV } from '../csvUtils';
import { CSVData, Player, OrderQuantities } from '../types';
import { COACH_CONFIG } from '../config';

describe('Coach Logic Bug Fix Verification', () => {
  const regularPlayer: Player = {
    barcode: '12345',
    team: 'Team A',
    firstName: 'John',
    lastName: 'Doe',
    jerseyNumber: '10',
    coach: 'N', // Not a coach
    cellPhone: '555-0123',
    email: 'john@example.com',
    products: '',
    packages: ''
  };

  const actualCoach: Player = {
    barcode: '67890',
    team: 'Team A',
    firstName: 'Jane',
    lastName: 'Smith',
    jerseyNumber: '15',
    coach: 'Y', // Actual coach
    cellPhone: '555-0456',
    email: 'jane@example.com',
    products: '',
    packages: ''
  };

  describe('The Original Bug Scenario', () => {
    it('should NOT mark regular players as coaches when they have orders - THIS WAS THE BUG', () => {
      // This was the exact scenario that was broken before:
      // Regular player (coach: 'N') with some orders was incorrectly being treated as a coach
      
      const playerWithOrders = { ...regularPlayer, coach: 'N' };
      const quantities = { '810': 2, 'A': 1 }; // Player has orders - this was triggering the bug
      
      const result = applyCoachLogic(playerWithOrders, quantities);
      
      // CRITICAL ASSERTIONS - these would have failed before the bug fix
      expect(result.updatedPlayer.coach).toBe('N'); // Should stay 'N', not become 'Y'
      expect(result.updatedPlayer.lastName).toBe('Doe'); // Should NOT get -C suffix
      expect(result.updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE]).toBeUndefined(); // Should NOT get free 810T
      
      // The bug was in line 96-97 of csvUtils.ts:
      // OLD (buggy) code: if (player.coach === 'Y' || Object.keys(quantities).length > 0)
      // NEW (fixed) code: if (player.coach === 'Y')
      // The || Object.keys(quantities).length > 0 part was incorrectly making ALL players with orders into coaches
    });

    it('should still apply coach logic to actual coaches', () => {
      const coachWithOrders = { ...actualCoach, coach: 'Y' };
      const quantities = { '810': 1 };
      
      const result = applyCoachLogic(coachWithOrders, quantities);
      
      // These should work correctly (and did work before the bug)
      expect(result.updatedPlayer.coach).toBe('Y');
      expect(result.updatedPlayer.lastName).toBe('Smith' + COACH_CONFIG.LAST_NAME_SUFFIX);
      expect(result.updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE]).toBe(1);
    });
  });

  describe('Edge Cases That Should Work Correctly', () => {
    it('should handle regular player with no orders', () => {
      const playerWithNoOrders = { ...regularPlayer, coach: 'N' };
      const quantities = {}; // No orders
      
      const result = applyCoachLogic(playerWithNoOrders, quantities);
      
      expect(result.updatedPlayer.coach).toBe('N');
      // Should get -N suffix instead (that's what NO_ORDER_CONFIG.LAST_NAME_SUFFIX actually is)
      expect(result.updatedPlayer.lastName).toContain('-N');
      expect(result.updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE]).toBeUndefined();
    });

    it('should handle coach with no orders', () => {
      const coachWithNoOrders = { ...actualCoach, coach: 'Y' };
      const quantities = {}; // No orders
      
      const result = applyCoachLogic(coachWithNoOrders, quantities);
      
      // Should still be treated as a coach
      expect(result.updatedPlayer.coach).toBe('Y');
      expect(result.updatedPlayer.lastName).toBe('Smith' + COACH_CONFIG.LAST_NAME_SUFFIX);
      expect(result.updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE]).toBe(1);
    });

    it('should handle mixed scenarios in updatePlayerInCSV', () => {
      // Create a scenario with multiple players, some coaches, some regular with orders
      const csvData: CSVData = {
        players: [regularPlayer, actualCoach],
        teams: ['Team A'],
        playersMap: new Map([
          ['12345', regularPlayer],
          ['67890', actualCoach]
        ]),
        teamPlayersMap: new Map([
          ['Team A', [regularPlayer, actualCoach]]
        ])
      };

      // Update regular player with orders - should NOT become coach
      const formData = {
        name: 'John Doe Updated',
        phone: '555-9999',
        email: 'john.updated@example.com',
        isCoach: false // Explicitly setting to false
      };
      const quantities = { '810': 3, 'A': 2 }; // Lots of orders

      const result = updatePlayerInCSV(csvData, '12345', formData, quantities);
      
      const updatedPlayer = result.playersMap.get('12345');
      
      // Should remain a regular player despite having orders
      expect(updatedPlayer?.coach).toBe('N');
      expect(updatedPlayer?.lastName).not.toContain('-C');
    });
  });

  describe('Regression Prevention', () => {
    it('should fail if the old buggy logic is accidentally reintroduced', () => {
      // This test would catch if someone accidentally reintroduces the bug
      
      const testCases: { player: Player; quantities: OrderQuantities; shouldBeCoach: boolean }[] = [
        { player: { ...regularPlayer, coach: 'N' }, quantities: { '810': 1 }, shouldBeCoach: false },
        { player: { ...regularPlayer, coach: 'N' }, quantities: { '810': 5, 'A': 2, 'B': 1 }, shouldBeCoach: false },
        { player: { ...actualCoach, coach: 'Y' }, quantities: { '810': 1 }, shouldBeCoach: true },
        { player: { ...actualCoach, coach: 'Y' }, quantities: {}, shouldBeCoach: true },
      ];

      testCases.forEach(({ player, quantities, shouldBeCoach }, index) => {
        const result = applyCoachLogic(player, quantities);
        
        if (shouldBeCoach) {
          expect(result.updatedPlayer.coach, `Test case ${index + 1}: Should be coach`).toBe('Y');
          expect(result.updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE], `Test case ${index + 1}: Should have free item`).toBe(1);
        } else {
          expect(result.updatedPlayer.coach, `Test case ${index + 1}: Should NOT be coach`).toBe('N');
          expect(result.updatedQuantities[COACH_CONFIG.FREE_ITEM_CODE], `Test case ${index + 1}: Should NOT have free item`).toBeUndefined();
        }
      });
    });
  });
});