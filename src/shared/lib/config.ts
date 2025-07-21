export const config = {
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',

    port: parseInt(process.env.PORT || '3000', 10),
    apiKey: process.env.API_KEY || 'change-me-in-production',

    whatsapp: {
        sessionPath: process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth',
        headless: true,
        puppeteerArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ] as string[]
    },

    features: {
        enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true',
        enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true'
    },

    logLevel: process.env.LOG_LEVEL || 'info'
} as const; 