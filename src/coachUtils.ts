// Coach-related utility functions
import { COACH_CONFIG, NO_ORDER_CONFIG } from './config';

/**
 * Removes the -C suffix from a player's last name for UI display
 */
export function cleanCoachSuffix(lastName: string): string {
  if (lastName.endsWith(COACH_CONFIG.LAST_NAME_SUFFIX)) {
    return lastName.slice(0, -COACH_CONFIG.LAST_NAME_SUFFIX.length);
  }
  return lastName;
}

/**
 * Removes the -C suffix from a full player name for UI display
 */
export function cleanCoachSuffixFromFullName(fullName: string): string {
  if (fullName.endsWith(COACH_CONFIG.LAST_NAME_SUFFIX)) {
    return fullName.slice(0, -COACH_CONFIG.LAST_NAME_SUFFIX.length);
  }
  return fullName;
}

/**
 * Checks if a name is a placeholder pattern like "Player 34"
 */
export function isPlaceholderName(name: string): boolean {
  return /^Player \d+$/.test(name.trim());
}

/**
 * Checks if a player is marked as a coach based on the coach field
 */
export function isPlayerCoach(coachValue: string): boolean {
  return coachValue === COACH_CONFIG.COACH_FIELD_VALUE;
}

/**
 * Gets the display name for a player, handling coach suffixes and placeholders
 */
export function getPlayerDisplayName(firstName: string, lastName: string, barcode: string): string {
  const fullName = `${firstName} ${lastName}`.trim();
  
  // If it's a placeholder pattern, return the barcode instead
  if (isPlaceholderName(fullName)) {
    return barcode;
  }
  
  // Clean any coach or no-order suffix for display
  let cleanName = cleanCoachSuffixFromFullName(fullName);
  cleanName = cleanNoOrderSuffixFromFullName(cleanName);
  
  // Return the clean name, or barcode if name is empty
  return cleanName || barcode;
}

/**
 * Gets the coach icon for display in dropdowns
 */
export function getCoachIcon(): string {
  return '👑'; // Crown emoji for coaches
}

/**
 * Removes the -N suffix from a player's last name for UI display
 */
export function cleanNoOrderSuffixFromLastName(lastName: string): string {
  if (lastName.endsWith(NO_ORDER_CONFIG.LAST_NAME_SUFFIX)) {
    return lastName.slice(0, -NO_ORDER_CONFIG.LAST_NAME_SUFFIX.length);
  }
  return lastName;
}

/**
 * Removes the -N suffix from a full player name for UI display
 */
export function cleanNoOrderSuffixFromFullName(fullName: string): string {
  if (fullName.endsWith(NO_ORDER_CONFIG.LAST_NAME_SUFFIX)) {
    return fullName.slice(0, -NO_ORDER_CONFIG.LAST_NAME_SUFFIX.length);
  }
  return fullName;
}

/**
 * Checks if a player has no orders (marked with -N suffix)
 */
export function isNoOrderPlayer(lastName: string): boolean {
  return lastName.endsWith(NO_ORDER_CONFIG.LAST_NAME_SUFFIX);
}

/**
 * Gets the no-order icon for display in dropdowns
 */
export function getNoOrderIcon(): string {
  return '🚫'; // Prohibited emoji for no-order players
}

/**
 * Formats a player name with coach icon for dropdown display
 */
export function formatPlayerNameWithCoachIcon(displayName: string, isCoach: boolean): string {
  return isCoach ? `${getCoachIcon()} ${displayName}` : displayName;
}

/**
 * Formats a player name with no-order icon for dropdown display
 */
export function formatPlayerNameWithNoOrderIcon(displayName: string, isNoOrder: boolean): string {
  return isNoOrder ? `${getNoOrderIcon()} ${displayName}` : displayName;
}

/**
 * Formats a player name with appropriate icons (coach or no-order) for dropdown display
 */
export function formatPlayerNameWithIcons(displayName: string, isCoach: boolean, isNoOrder: boolean): string {
  if (isCoach) {
    return `${getCoachIcon()} ${displayName}`;
  } else if (isNoOrder) {
    return `${getNoOrderIcon()} ${displayName}`;
  }
  return displayName;
}