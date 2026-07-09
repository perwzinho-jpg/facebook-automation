const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Cores
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  const time = timestamp.split(' ')[1]; // Apenas HH:mm:ss
  const timeFormatted = `${colors.gray}${time}${colors.reset}`;

  let levelColor = colors.white;
  let levelSymbol = '•';

  if (level === 'error') {
    levelColor = colors.red;
    levelSymbol = '✗';
  } else if (level === 'warn') {
    levelColor = colors.yellow;
    levelSymbol = '⚠';
  } else if (level === 'info') {
    levelColor = colors.blue;
    levelSymbol = '•';
  }

  return `${timeFormatted} ${levelColor}${levelSymbol}${colors.reset} ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bm-automation' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      )
    })
  ]
});

// Métodos customizados para melhor formatação
logger.section = (title) => {
  console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
};

logger.step = (num, title) => {
  console.log(`${colors.bright}${colors.blue}[${num}]${colors.reset} ${colors.bright}${title}${colors.reset}`);
};

logger.success = (message) => {
  logger.info(`${colors.green}✅ ${message}${colors.reset}`);
};

logger.error_msg = (message) => {
  logger.error(`${colors.red}❌ ${message}${colors.reset}`);
};

logger.warning = (message) => {
  logger.warn(`${colors.yellow}⚠️  ${message}${colors.reset}`);
};

logger.info_msg = (message) => {
  logger.info(`${colors.blue}ℹ️  ${message}${colors.reset}`);
};

logger.status = (icon, message) => {
  logger.info(`${icon} ${message}`);
};

logger.divider = (char = '─') => {
  console.log(`${colors.gray}${char.repeat(70)}${colors.reset}`);
};

module.exports = logger;
