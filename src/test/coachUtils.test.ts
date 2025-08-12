import { describe, it, expect } from 'vitest';
import {
  cleanCoachSuffix,
  cleanCoachSuffixFromFullName,
  cleanNoOrderSuffixFromLastName,
  cleanNoOrderSuffixFromFullName,
  isPlaceholderName,
  isPlayerCoach,
  isNoOrderPlayer,
  getPlayerDisplayName,
  formatPlayerNameWithCoachIcon,
  formatPlayerNameWithNoOrderIcon,
  formatPlayerNameWithIcons,
  getCoachIcon,
  getNoOrderIcon
} from '../coachUtils';

describe('Coach Utilities', () => {
  describe('cleanCoachSuffix', () => {
    it('should remove -C suffix from last name', () => {
      expect(cleanCoachSuffix('Smith-C')).toBe('Smith');
      expect(cleanCoachSuffix('Johnson-C')).toBe('Johnson');
    });

    it('should not modify names without -C suffix', () => {
      expect(cleanCoachSuffix('Smith')).toBe('Smith');
      expect(cleanCoachSuffix('Johnson')).toBe('Johnson');
    });

    it('should handle empty strings', () => {
      expect(cleanCoachSuffix('')).toBe('');
    });
  });

  describe('cleanCoachSuffixFromFullName', () => {
    it('should remove -C suffix from full name', () => {
      expect(cleanCoachSuffixFromFullName('John Smith-C')).toBe('John Smith');
      expect(cleanCoachSuffixFromFullName('Jane Johnson-C')).toBe('Jane Johnson');
    });

    it('should not modify full names without -C suffix', () => {
      expect(cleanCoachSuffixFromFullName('John Smith')).toBe('John Smith');
      expect(cleanCoachSuffixFromFullName('Jane Johnson')).toBe('Jane Johnson');
    });
  });

  describe('isPlaceholderName', () => {
    it('should detect placeholder patterns', () => {
      expect(isPlaceholderName('Player 1')).toBe(true);
      expect(isPlaceholderName('Player 34')).toBe(true);
      expect(isPlaceholderName('Player 123')).toBe(true);
    });

    it('should not detect non-placeholder names', () => {
      expect(isPlaceholderName('John Smith')).toBe(false);
      expect(isPlaceholderName('Player John')).toBe(false);
      expect(isPlaceholderName('PlayerOne')).toBe(false);
      expect(isPlaceholderName('')).toBe(false);
    });

    it('should handle whitespace correctly', () => {
      expect(isPlaceholderName(' Player 34 ')).toBe(true);
      expect(isPlaceholderName('Player  34')).toBe(false); // double space
    });
  });

  describe('isPlayerCoach', () => {
    it('should detect coach field value', () => {
      expect(isPlayerCoach('Y')).toBe(true);
    });

    it('should not detect non-coach values', () => {
      expect(isPlayerCoach('N')).toBe(false);
      expect(isPlayerCoach('n')).toBe(false);
      expect(isPlayerCoach('y')).toBe(false);
      expect(isPlayerCoach('')).toBe(false);
    });
  });

  describe('getPlayerDisplayName', () => {
    it('should return clean full name for regular players', () => {
      expect(getPlayerDisplayName('John', 'Smith', '12345')).toBe('John Smith');
      expect(getPlayerDisplayName('Jane', 'Johnson', '67890')).toBe('Jane Johnson');
    });

    it('should clean coach suffix from display name', () => {
      expect(getPlayerDisplayName('John', 'Smith-C', '12345')).toBe('John Smith');
      expect(getPlayerDisplayName('Jane', 'Johnson-C', '67890')).toBe('Jane Johnson');
    });

    it('should clean no-order suffix from display name', () => {
      expect(getPlayerDisplayName('John', 'Smith-N', '12345')).toBe('John Smith');
      expect(getPlayerDisplayName('Jane', 'Johnson-N', '67890')).toBe('Jane Johnson');
    });

    it('should return barcode for placeholder names', () => {
      expect(getPlayerDisplayName('Player', '34', '12345')).toBe('12345');
      expect(getPlayerDisplayName('Player', '1', '67890')).toBe('67890');
    });

    it('should return barcode for empty names', () => {
      expect(getPlayerDisplayName('', '', '12345')).toBe('12345');
      expect(getPlayerDisplayName('   ', '   ', '67890')).toBe('67890');
    });
  });

  describe('getCoachIcon', () => {
    it('should return crown emoji', () => {
      expect(getCoachIcon()).toBe('👑');
    });
  });

  describe('formatPlayerNameWithCoachIcon', () => {
    it('should add coach icon for coaches', () => {
      expect(formatPlayerNameWithCoachIcon('John Smith', true)).toBe('👑 John Smith');
      expect(formatPlayerNameWithCoachIcon('Jane Johnson', true)).toBe('👑 Jane Johnson');
    });

    it('should not add icon for non-coaches', () => {
      expect(formatPlayerNameWithCoachIcon('John Smith', false)).toBe('John Smith');
      expect(formatPlayerNameWithCoachIcon('Jane Johnson', false)).toBe('Jane Johnson');
    });

    it('should handle empty names', () => {
      expect(formatPlayerNameWithCoachIcon('', true)).toBe('👑 ');
      expect(formatPlayerNameWithCoachIcon('', false)).toBe('');
    });
  });

  describe('cleanNoOrderSuffixFromLastName', () => {
    it('should remove -N suffix from last name', () => {
      expect(cleanNoOrderSuffixFromLastName('Smith-N')).toBe('Smith');
      expect(cleanNoOrderSuffixFromLastName('Johnson-N')).toBe('Johnson');
    });

    it('should not modify names without -N suffix', () => {
      expect(cleanNoOrderSuffixFromLastName('Smith')).toBe('Smith');
      expect(cleanNoOrderSuffixFromLastName('Johnson')).toBe('Johnson');
    });

    it('should handle empty strings', () => {
      expect(cleanNoOrderSuffixFromLastName('')).toBe('');
    });
  });

  describe('cleanNoOrderSuffixFromFullName', () => {
    it('should remove -N suffix from full name', () => {
      expect(cleanNoOrderSuffixFromFullName('John Smith-N')).toBe('John Smith');
      expect(cleanNoOrderSuffixFromFullName('Jane Johnson-N')).toBe('Jane Johnson');
    });

    it('should not modify full names without -N suffix', () => {
      expect(cleanNoOrderSuffixFromFullName('John Smith')).toBe('John Smith');
      expect(cleanNoOrderSuffixFromFullName('Jane Johnson')).toBe('Jane Johnson');
    });
  });

  describe('isNoOrderPlayer', () => {
    it('should detect no-order players by -N suffix', () => {
      expect(isNoOrderPlayer('Smith-N')).toBe(true);
      expect(isNoOrderPlayer('Johnson-N')).toBe(true);
    });

    it('should not detect regular players', () => {
      expect(isNoOrderPlayer('Smith')).toBe(false);
      expect(isNoOrderPlayer('Johnson')).toBe(false);
      expect(isNoOrderPlayer('Smith-C')).toBe(false);
      expect(isNoOrderPlayer('')).toBe(false);
    });
  });

  describe('getNoOrderIcon', () => {
    it('should return prohibited emoji', () => {
      expect(getNoOrderIcon()).toBe('🚫');
    });
  });

  describe('formatPlayerNameWithNoOrderIcon', () => {
    it('should add no-order icon for no-order players', () => {
      expect(formatPlayerNameWithNoOrderIcon('John Smith', true)).toBe('🚫 John Smith');
      expect(formatPlayerNameWithNoOrderIcon('Jane Johnson', true)).toBe('🚫 Jane Johnson');
    });

    it('should not add icon for regular players', () => {
      expect(formatPlayerNameWithNoOrderIcon('John Smith', false)).toBe('John Smith');
      expect(formatPlayerNameWithNoOrderIcon('Jane Johnson', false)).toBe('Jane Johnson');
    });

    it('should handle empty names', () => {
      expect(formatPlayerNameWithNoOrderIcon('', true)).toBe('🚫 ');
      expect(formatPlayerNameWithNoOrderIcon('', false)).toBe('');
    });
  });

  describe('formatPlayerNameWithIcons', () => {
    it('should add coach icon when isCoach is true', () => {
      expect(formatPlayerNameWithIcons('John Smith', true, false)).toBe('👑 John Smith');
      expect(formatPlayerNameWithIcons('Jane Johnson', true, true)).toBe('👑 Jane Johnson'); // Coach takes precedence
    });

    it('should add no-order icon when isNoOrder is true and not coach', () => {
      expect(formatPlayerNameWithIcons('John Smith', false, true)).toBe('🚫 John Smith');
      expect(formatPlayerNameWithIcons('Jane Johnson', false, true)).toBe('🚫 Jane Johnson');
    });

    it('should not add icons for regular players', () => {
      expect(formatPlayerNameWithIcons('John Smith', false, false)).toBe('John Smith');
      expect(formatPlayerNameWithIcons('Jane Johnson', false, false)).toBe('Jane Johnson');
    });

    it('should handle empty names', () => {
      expect(formatPlayerNameWithIcons('', true, false)).toBe('👑 ');
      expect(formatPlayerNameWithIcons('', false, true)).toBe('🚫 ');
      expect(formatPlayerNameWithIcons('', false, false)).toBe('');
    });
  });
});