// Debug logging system for CSV parsing issues
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export class DebugLogger {
  private static instance: DebugLogger;
  private logFilePath = './debug.log'; // Use relative path
  private consoleOnlyMode = false;
  private fileWriteTestDone = false;

  private constructor() {
    // Test file writing capability immediately
    this.testFileWriting();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  // Test if we can write to the file system
  private async testFileWriting(): Promise<void> {
    if (this.fileWriteTestDone) return;
    
    try {
      const testMessage = `[${this.formatTimestamp()}] INFO: Debug logger initialized - testing file write capability\n`;
      await writeTextFile(this.logFilePath, testMessage);
      console.log('📝 Debug logging initialized - writing to:', this.logFilePath);
      this.consoleOnlyMode = false;
    } catch (error) {
      console.warn('⚠️ File writing failed, switching to console-only mode:', error);
      this.consoleOnlyMode = true;
    }
    this.fileWriteTestDone = true;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').replace('Z', '');
  }

  // Simplified - no rotation for now, just focus on getting basic logging working
  private async ensureFileWritingWorks(): Promise<void> {
    if (!this.fileWriteTestDone) {
      await this.testFileWriting();
    }
  }

  private async appendToFile(level: string, message: string): Promise<void> {
    const timestamp = this.formatTimestamp();
    const logLine = `[${timestamp}] ${level}: ${message}\n`;
    
    // Always output to console
    const emoji = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'DEBUG' ? '🔍' : '📝';
    console.log(`${emoji} ${message}`);
    
    // Skip file operations if in console-only mode
    if (this.consoleOnlyMode) {
      return;
    }
    
    // Ensure file writing is tested
    await this.ensureFileWritingWorks();
    
    // Try to append to file
    try {
      let existingContent = '';
      try {
        existingContent = await readTextFile(this.logFilePath);
      } catch (error) {
        // File doesn't exist, will be created
        existingContent = '';
      }
      
      await writeTextFile(this.logFilePath, existingContent + logLine);
    } catch (error) {
      console.error('📁 File write failed, switching to console-only mode:', error);
      this.consoleOnlyMode = true;
    }
  }

  async info(message: string): Promise<void> {
    await this.appendToFile('INFO', message);
  }

  async error(message: string, error?: any): Promise<void> {
    const fullMessage = error ? `${message}: ${error instanceof Error ? error.message : String(error)}` : message;
    await this.appendToFile('ERROR', fullMessage);
  }

  async debug(message: string): Promise<void> {
    await this.appendToFile('DEBUG', message);
  }

  async warn(message: string): Promise<void> {
    await this.appendToFile('WARN', message);
  }

  async logObject(label: string, obj: any): Promise<void> {
    const objStr = typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj);
    await this.debug(`${label}: ${objStr}`);
  }

  async startSection(title: string): Promise<void> {
    const separator = '='.repeat(50);
    await this.info(`${separator}`);
    await this.info(`${title}`);
    await this.info(`${separator}`);
  }

  async clearLog(): Promise<void> {
    try {
      await writeTextFile(this.logFilePath, '');
      await this.info('Debug log cleared');
    } catch (error) {
      console.error('Failed to clear debug log:', error);
    }
  }

  async getRecentLogs(lines: number = 50): Promise<string> {
    try {
      const content = await readTextFile(this.logFilePath);
      const allLines = content.split('\n');
      const recentLines = allLines.slice(-lines);
      return recentLines.join('\n');
    } catch (error) {
      return `Failed to read debug log: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Initialize logging session
  async initSession(sessionName: string): Promise<void> {
    await this.ensureFileWritingWorks();
    await this.startSection(`CSV DEBUG SESSION: ${sessionName}`);
    await this.info(`Session started at ${this.formatTimestamp()}`);
  }
}