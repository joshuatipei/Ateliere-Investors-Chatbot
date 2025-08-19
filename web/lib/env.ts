/**
 * Environment variable validation for the web/API process
 * Throws readable errors if required variables are missing
 */

export function assertEnv() {
  const required = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }

  return required as {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    OPENAI_API_KEY: string;
  };
}

// Validate on module load
export const env = assertEnv();

/**
 * Environment validation for indexer scripts (includes SERVICE_ROLE)
 */
export function assertIndexerEnv() {
  const required = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for indexer: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }

  return required as {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE: string;
    OPENAI_API_KEY: string;
  };
}
