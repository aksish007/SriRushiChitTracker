import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  userId?: string;
  registrationId?: string;
  action?: string;
  endpoint?: string;
  ipAddress?: string;
  userAgent?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
  requestId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  logDir: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  enableConsole: boolean;
  enableFile: boolean;
}

class Logger {
  private config: LoggerConfig;
  private logDir: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      logDir: config.logDir || './logs',
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles || 30, // Keep 30 days of logs
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile !== false,
    };

    this.logDir = path.resolve(this.config.logDir);
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `app-${year}-${month}-${day}.log`;
  }

  private getLogFilePath(date: Date = new Date()): string {
    return path.join(this.logDir, this.getLogFileName(date));
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level}] ${entry.message}`;
    
    const identifiers = [];
    if (entry.userId) identifiers.push(`UserID:${entry.userId}`);
    if (entry.registrationId) identifiers.push(`RegID:${entry.registrationId}`);
    if (entry.action) identifiers.push(`Action:${entry.action}`);
    if (entry.endpoint) identifiers.push(`Endpoint:${entry.endpoint}`);
    if (entry.requestId) identifiers.push(`ReqID:${entry.requestId}`);
    if (entry.sessionId) identifiers.push(`SessionID:${entry.sessionId}`);
    if (entry.ipAddress) identifiers.push(`IP:${entry.ipAddress}`);
    
    const identifiersStr = identifiers.length > 0 ? ` [${identifiers.join('|')}]` : '';
    
    let logLine = baseLog + identifiersStr;
    
    if (entry.error) {
      logLine += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.code) logLine += ` (Code: ${entry.error.code})`;
      if (entry.error.stack) {
        logLine += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logLine += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    return logLine;
  }

  private async writeToFile(logEntry: LogEntry): Promise<void> {
    if (!this.config.enableFile) return;

    try {
      const logFilePath = this.getLogFilePath();
      const formattedLog = this.formatLogEntry(logEntry) + '\n';
      
      await fs.promises.appendFile(logFilePath, formattedLog, 'utf8');
      
      // Check file size and rotate if necessary
      await this.rotateLogFileIfNeeded(logFilePath);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async rotateLogFileIfNeeded(logFilePath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(logFilePath);
      
      if (stats.size > this.config.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${logFilePath}.${timestamp}`;
        await fs.promises.rename(logFilePath, rotatedPath);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          stats: fs.statSync(path.join(this.logDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Keep only the most recent maxFiles
      if (logFiles.length > this.config.maxFiles) {
        const filesToDelete = logFiles.slice(this.config.maxFiles);
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            console.error(`Failed to delete old log file ${file.name}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  private log(level: LogLevel, message: string, options: Partial<LogEntry> = {}): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...options
    };

    // Write to console
    if (this.config.enableConsole) {
      const consoleMessage = this.formatLogEntry(entry);
      switch (level) {
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(consoleMessage);
          break;
        case LogLevel.WARN:
          console.warn(consoleMessage);
          break;
        case LogLevel.INFO:
          console.info(consoleMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(consoleMessage);
          break;
      }
    }

    // Write to file
    this.writeToFile(entry);

    // Cleanup old logs periodically
    if (Math.random() < 0.01) { // 1% chance to run cleanup
      this.cleanupOldLogs();
    }
  }

  debug(message: string, options?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  info(message: string, options?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, message, options);
  }

  warn(message: string, options?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, message, options);
  }

  error(message: string, error?: Error, options?: Partial<LogEntry>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    } : undefined;

    this.log(LogLevel.ERROR, message, {
      ...options,
      error: errorInfo
    });
  }

  fatal(message: string, error?: Error, options?: Partial<LogEntry>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    } : undefined;

    this.log(LogLevel.FATAL, message, {
      ...options,
      error: errorInfo
    });
  }


}

// Create singleton instance
const logger = new Logger({
  logDir: process.env.LOG_DIR || './logs',
  maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '30'), // 30 days
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
});

// Override info, debug, and warn methods to only log errors
logger.info = () => {}; // Disable info logging
logger.debug = () => {}; // Disable debug logging
logger.warn = () => {}; // Disable warn logging

export default logger;
