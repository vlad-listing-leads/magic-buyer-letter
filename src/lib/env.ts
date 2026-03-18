/**
 * Type-safe environment variable access.
 * Uses getters to defer validation until actual usage (avoids build-time errors).
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string = ''): string {
  return process.env[key] || fallback
}

/** Server-only env vars — never import on client */
export const env = {
  get supabase() {
    return {
      url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    }
  },
  get crossAppAuth() {
    return {
      secret: requireEnv('CROSS_APP_AUTH_SECRET'),
    }
  },
  listingLeads: {
    get supabaseUrl() { return optionalEnv('LISTING_LEADS_SUPABASE_URL') },
    get serviceRoleKey() { return optionalEnv('LISTING_LEADS_SUPABASE_SERVICE_ROLE_KEY') },
  },
  app: {
    get url() { return optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3010') },
    get llUrl() { return optionalEnv('NEXT_PUBLIC_LL_URL', 'https://listingleads.com') },
  },
  reapi: {
    get key() { return optionalEnv('REAPI_KEY') },
    get userId() { return optionalEnv('REAPI_USER_ID') },
  },
  lob: {
    get apiKey() { return optionalEnv('LOB_API_KEY') },
    get webhookSecret() { return optionalEnv('LOB_WEBHOOK_SECRET') },
    get templateId() { return optionalEnv('LOB_TEMPLATE_ID') },
  },
  anthropic: {
    get apiKey() { return optionalEnv('ANTHROPIC_API_KEY') },
  },
  stripe: {
    get secretKey() { return optionalEnv('STRIPE_SECRET_KEY') },
    get webhookSecret() { return optionalEnv('STRIPE_WEBHOOK_SECRET') },
  },
  dev: {
    get loginEnabled() { return optionalEnv('DEV_LOGIN_ENABLED') === 'true' },
    get userEmail() { return optionalEnv('DEV_USER_EMAIL', 'dev@localhost.test') },
  },
  get isDev() { return process.env.NODE_ENV === 'development' },
  get isProd() { return process.env.NODE_ENV === 'production' },
}
