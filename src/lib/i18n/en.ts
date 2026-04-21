import type { Dict } from './types';

const en: Dict = {
  nav: { chat: 'Chat', image: 'Image', video: 'Video' },
  chat: { send: 'Send', placeholder: 'Ask anything…', thinking: 'Thinking…' },
  image: {
    prompt: 'Prompt', promptPlaceholder: 'Describe the image…',
    ratio: 'Aspect ratio', batch: 'Batch', generate: 'Generate', generating: 'Generating…',
    empty: 'Your images will appear here.',
  },
  video: {
    prompt: 'Prompt', promptPlaceholder: 'Describe the video…',
    duration: 'Duration', resolution: 'Resolution', aspectRatio: 'Aspect ratio',
    firstFrame: 'First frame (optional)', refImages: 'Reference images (optional)',
    refImagesHint: 'Up to 4 images. If uploaded, routes to kling-v3-omni.',
    generate: 'Generate', generating: 'Generating…',
    providerLabel: 'Provider', empty: 'Your videos will appear here.',
  },
  common: {
    loading: 'Loading…', error: 'Something went wrong', retry: 'Retry',
    expiresAt: 'Expires at', saveNow: 'Save now before it expires',
    seconds: 's', minutes: 'm', hours: 'h',
  },
  errors: {
    INVALID_KEY: 'Server misconfigured: API key invalid. Please contact the admin.',
    CONTENT_POLICY: 'Blocked by the content safety filter. Try a different prompt.',
    RATE_LIMITED: 'Rate limit reached. Please wait a moment and retry.',
    NETWORK_ERROR: 'Network error. Please retry.',
    UNKNOWN: 'Unexpected error. Please retry.',
  },
};
export default en;
