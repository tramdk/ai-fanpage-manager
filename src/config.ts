/**
 * Centralize all environment-specific configurations
 */
export const CONFIG = {
  // Base URL for API requests. Can be configured via .env in build time if needed.
  API_BASE_URL: (import.meta as any).env?.VITE_API_URL || '',

  // Default values for common settings
  DEFAULT_TIME: '09:00',
  DEFAULT_RUN_COUNT: 1,
  MAX_RUN_COUNT: 30,

  // Tones for AI content generation
  AI_TONES: [
    { value: 'professional and elegant', label: 'Professional & Elegant' },
    { value: 'fun and energetic', label: 'Fun & Energetic' },
    { value: 'storytelling', label: 'Storytelling' },
    { value: 'direct and promotional', label: 'Direct & Promotional' },
  ],

  // Role constants
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
  },

  /**
   * Returns the full API URL for a given path
   */
  getApiUrl: (path: string) => {
    const base = CONFIG.API_BASE_URL.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }
};
