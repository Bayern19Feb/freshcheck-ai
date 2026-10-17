// Application-wide settings. Model-specific values (thresholds, evaluation
// results) live in config/model-card.json so they can be updated without
// touching code.

export const APP_VERSION = '0.3.0';

export const MODEL_DIR = 'models/fruit-freshness/';
export const MODEL_CARD_URL = 'config/model-card.json';

// Used only if the model card does not provide a value.
export const FALLBACK_THRESHOLDS = { default: 0.75, perFruit: {} };
export const FALLBACK_MIN_MARGIN = 0.15;

// Image handling
export const MAX_FILE_BYTES = 25 * 1024 * 1024;            // refuse files larger than 25 MB
export const ANALYSIS_MAX_SIDE = 640;                        // downscale before analysis
export const THUMB_MAX_SIDE = 160;                           // history thumbnail size
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

// How long to wait for model files before giving up (ms)
export const MODEL_LOAD_TIMEOUT = 45000;
