// Input validation utilities for MVS Photo Form Filler

// Phone number utilities
export function formatPhoneNumber(input: string): string {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);
  
  // Format based on length
  if (limitedDigits.length === 0) return '';
  if (limitedDigits.length <= 3) return limitedDigits;
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  }
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
}

export function getPhoneDigits(formattedPhone: string): string {
  // Extract only digits from formatted phone number
  return formattedPhone.replace(/\D/g, '');
}

export function isValidPhoneNumber(phone: string): boolean {
  // Valid if empty (optional) or exactly 10 digits
  const digits = getPhoneDigits(phone);
  return digits === '' || digits.length === 10;
}

// Email validation utilities
export function isValidEmail(email: string): boolean {
  // Valid if empty (optional) or matches basic email pattern
  if (email.trim() === '') return true;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Get validation status for form fields
export function getValidationState(phone: string, email: string): {
  phoneValid: boolean;
  emailValid: boolean;
  allValid: boolean;
} {
  const phoneValid = isValidPhoneNumber(phone);
  const emailValid = isValidEmail(email);
  
  return {
    phoneValid,
    emailValid,
    allValid: phoneValid && emailValid
  };
}