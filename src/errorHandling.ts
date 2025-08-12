// Comprehensive error handling utilities for MVS Photo Form Filler

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  TAURI_NOT_AVAILABLE: 'TAURI_NOT_AVAILABLE',
  CSV_PARSE_ERROR: 'CSV_PARSE_ERROR',
  SAVE_ERROR: 'SAVE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  RUST_BACKEND_ERROR: 'RUST_BACKEND_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
} as const;

export interface ErrorHandlerOptions {
  showUserAlert?: boolean;
  logToConsole?: boolean;
  includeStackTrace?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: Error | AppError, options: ErrorHandlerOptions = {}): void {
    const {
      showUserAlert = true,
      logToConsole = true,
      includeStackTrace = process.env.NODE_ENV === 'development'
    } = options;

    // Log to console for debugging
    if (logToConsole) {
      console.group('🚨 Application Error');
      console.error('Error:', error.message);
      
      if (error instanceof AppError) {
        console.error('Code:', error.code);
        if (error.details) {
          console.error('Details:', error.details);
        }
      }
      
      if (includeStackTrace && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      
      console.groupEnd();
    }

    // Show user-friendly error message
    if (showUserAlert) {
      const userMessage = this.getUserFriendlyMessage(error);
      alert(userMessage);
    }
  }

  private getUserFriendlyMessage(error: Error | AppError): string {
    if (error instanceof AppError && error.userMessage) {
      return error.userMessage;
    }

    if (error instanceof AppError) {
      switch (error.code) {
        case ErrorCodes.FILE_ACCESS_DENIED:
          return 'Access to the file was denied. Please check file permissions and try again.';
        
        case ErrorCodes.TAURI_NOT_AVAILABLE:
          return 'Desktop functionality is not available. Please run this as a Tauri desktop application.';
        
        case ErrorCodes.CSV_PARSE_ERROR:
          return 'Unable to read the CSV file. Please check that it\'s properly formatted and try again.';
        
        case ErrorCodes.SAVE_ERROR:
          return 'Failed to save the file. Please check your permissions and try again.';
        
        case ErrorCodes.VALIDATION_ERROR:
          return 'Invalid data detected. Please check your inputs and try again.';
        
        case ErrorCodes.PLAYER_NOT_FOUND:
          return 'Player not found. Please refresh and try again.';
        
        case ErrorCodes.RUST_BACKEND_ERROR:
          return 'Backend operation failed. Please try again or restart the application.';
        
        case ErrorCodes.PERMISSION_ERROR:
          return 'Permission denied. Please check file permissions and try again.';
        
        default:
          return `Application error: ${error.message}`;
      }
    }

    // Generic error message for unknown errors
    return `An unexpected error occurred: ${error.message}\\n\\nPlease try again or contact support if the problem persists.`;
  }

  // Wrapper for async operations with error handling
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorContext: string,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(
            `Error in ${errorContext}: ${error instanceof Error ? error.message : String(error)}`,
            'UNKNOWN_ERROR',
            { context: errorContext, originalError: error }
          );
      
      this.handleError(appError, options);
      return null;
    }
  }

  // Validation helpers
  validateFile(file: File): void {
    if (!file) {
      throw new AppError(
        'No file provided',
        ErrorCodes.VALIDATION_ERROR,
        { file },
        'Please select a file first.'
      );
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new AppError(
        'Invalid file type',
        ErrorCodes.VALIDATION_ERROR,
        { fileName: file.name, type: file.type },
        'Please select a CSV file (.csv extension required).'
      );
    }

    if (file.size === 0) {
      throw new AppError(
        'Empty file',
        ErrorCodes.VALIDATION_ERROR,
        { fileName: file.name, size: file.size },
        'The selected file appears to be empty. Please check the file and try again.'
      );
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new AppError(
        'File too large',
        ErrorCodes.VALIDATION_ERROR,
        { fileName: file.name, size: file.size },
        'File is too large. Please use a CSV file smaller than 10MB.'
      );
    }
  }

  validatePlayerData(player: any): void {
    if (!player) {
      throw new AppError(
        'Player data is missing',
        ErrorCodes.VALIDATION_ERROR,
        { player },
        'Player data is required.'
      );
    }

    if (!player.barcode) {
      throw new AppError(
        'Player barcode is missing',
        ErrorCodes.VALIDATION_ERROR,
        { player },
        'Each player must have a barcode.'
      );
    }
  }

  // Safe operation wrapper
  safely<T>(operation: () => T, defaultValue: T, context?: string): T {
    try {
      return operation();
    } catch (error) {
      console.warn(`Safe operation failed${context ? ` in ${context}` : ''}:`, error);
      return defaultValue;
    }
  }
}

// Convenience functions
export const handleError = (error: Error | AppError, options?: ErrorHandlerOptions) => {
  ErrorHandler.getInstance().handleError(error, options);
};

export const withErrorHandling = <T>(
  operation: () => Promise<T>,
  context: string,
  options?: ErrorHandlerOptions
) => {
  return ErrorHandler.getInstance().withErrorHandling(operation, context, options);
};

export const safely = <T>(operation: () => T, defaultValue: T, context?: string) => {
  return ErrorHandler.getInstance().safely(operation, defaultValue, context);
};