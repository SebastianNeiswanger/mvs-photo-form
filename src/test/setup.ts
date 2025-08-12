import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs for testing
const mockTauri = {
  __TAURI_INTERNALS__: {
    invoke: vi.fn(),
  }
};

Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: mockTauri.__TAURI_INTERNALS__,
  writable: true,
});

// Mock window.URL.createObjectURL and related methods for CSV download tests
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement and related methods
const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn(),
};

const originalCreateElement = document.createElement;
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    return mockAnchor as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock document.body methods
document.body.appendChild = vi.fn();
document.body.removeChild = vi.fn();