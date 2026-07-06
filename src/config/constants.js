module.exports = {
  // URLs
  FACEBOOK_URL: 'https://www.facebook.com',
  FACEBOOK_BUSINESS_URL: 'https://business.facebook.com',
  FACEBOOK_BUSINESS_LOGIN: 'https://business.facebook.com/business/loginpage/?login_options[0]=FB&login_options[1]=IG&login_options[2]=SSO&config_ref=biz_login_tool_flavor_mbs&create_business_portfolio_for_bm=1',

  // Timeouts
  DEFAULT_TIMEOUT: 30000,
  NAVIGATION_TIMEOUT: 45000,
  MODAL_TIMEOUT: 10000,

  // Delays
  MIN_DELAY: 1000,
  MAX_DELAY: 3000,
  MODAL_DELAY: 2000,
  ACTION_DELAY: 500,

  // Retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,

  // Status
  STATUS: {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    STOPPED: 'stopped'
  },

  // Actions
  ACTIONS: {
    LOGIN: 'login',
    TWO_FA: '2fa',
    MODALS: 'modals',
    LANGUAGE: 'language',
    BUSINESS_PORTFOLIO: 'business_portfolio',
    DOMAIN_CONFIG: 'domain_config',
    CLOUDFLARE_WORKER: 'cloudflare_worker',
    DOMAIN_VERIFY: 'domain_verify',
    WHATSAPP_CREATE: 'whatsapp_create',
    SMS_BUY: 'sms_buy',
    SMS_VERIFY: 'sms_verify'
  },

  // Regex Patterns
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    CNPJ: /\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/,
    UID: /\d{15,}/,
    BUSINESS_ID: /business_id=(\d+)/,
    COOKIES: /c_user=(\d+)/
  },

  // Countries
  COUNTRIES: {
    BR: 'Brazil',
    US: 'United States',
    MX: 'Mexico',
    AR: 'Argentina',
    CL: 'Chile'
  },

  // Page titles para validação
  PAGE_TITLES: {
    FACEBOOK: 'Facebook',
    FACEBOOK_BUSINESS: 'Meta Business Suite',
    SECURITY_CENTER: 'Security Center'
  }
};
