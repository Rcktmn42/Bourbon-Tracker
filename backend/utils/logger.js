// backend/utils/logger.js
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Logger {
  constructor() {
    // Environment-aware log directory
    const isProduction = process.env.NODE_ENV === 'production';
    this.logDir = isProduction 
      ? '/var/log/bourbon-tracker'  // Standard production log location
      : join(__dirname, '..', 'logs'); // Development relative path
    
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    try {
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
      // Fallback to relative path
      this.logDir = join(__dirname, '..', 'logs');
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }
    }
  }

  formatMessage(level, category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      ...(data && { data }),
      pid: process.pid,
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    };
    
    return JSON.stringify(logEntry) + '\n';
  }

  writeToFile(filename, content) {
    try {
      const filePath = join(this.logDir, filename);
      appendFileSync(filePath, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
      // Fallback to console
      console.log(content.trim());
    }
  }

  email(level, message, data = null) {
    const formatted = this.formatMessage(level, 'EMAIL', message, data);
    this.writeToFile('email.log', formatted);
    
    // Also log to console for immediate visibility
    const consoleMsg = `[${level}] EMAIL: ${message}`;
    if (data) {
      console.log(consoleMsg, data);
    } else {
      console.log(consoleMsg);
    }
  }

  auth(level, message, data = null) {
    const formatted = this.formatMessage(level, 'AUTH', message, data);
    this.writeToFile('auth.log', formatted);
    
    const consoleMsg = `[${level}] AUTH: ${message}`;
    if (data) {
      console.log(consoleMsg, data);
    } else {
      console.log(consoleMsg);
    }
  }

  error(category, message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...(error.response && { response: error.response })
    } : null;
    
    const formatted = this.formatMessage('ERROR', category, message, errorData);
    this.writeToFile('error.log', formatted);
    
    console.error(`[ERROR] ${category}: ${message}`, error);
  }

  info(category, message, data = null) {
    const formatted = this.formatMessage('INFO', category, message, data);
    this.writeToFile('app.log', formatted);
    console.log(`[INFO] ${category}: ${message}`, data || '');
  }

  debug(category, message, data = null) {
    if (process.env.NODE_ENV !== 'production') {
      const formatted = this.formatMessage('DEBUG', category, message, data);
      this.writeToFile('debug.log', formatted);
      console.log(`[DEBUG] ${category}: ${message}`, data || '');
    }
  }
}

// Export singleton instance
export default new Logger();