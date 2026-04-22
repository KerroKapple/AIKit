export type Locale = 'en' | 'zh' | 'th';
export const LOCALES: readonly Locale[] = ['en', 'zh', 'th'];
export const DEFAULT_LOCALE: Locale = 'en';

export type Dict = {
  nav: { chat: string; image: string; video: string };
  chat: { send: string; placeholder: string; thinking: string };
  image: {
    prompt: string; promptPlaceholder: string;
    ratio: string; batch: string; generate: string; generating: string;
    empty: string;
  };
  video: {
    prompt: string; promptPlaceholder: string;
    duration: string; resolution: string; aspectRatio: string;
    firstFrame: string; refImages: string; refImagesHint: string;
    generate: string; generating: string;
    providerLabel: string; empty: string;
  };
  common: {
    loading: string; error: string; retry: string;
    expiresAt: string; saveNow: string;
    seconds: string; minutes: string; hours: string;
  };
  masthead: {
    marquee: readonly string[];
    est: string;
    subtitle: string;
    dispatchRoom: string;
    colophon: string;
    colophonBody: string;
    imprint: string;
    imprintBody: string;
    fin: string;
  };
  errors: {
    INVALID_KEY: string;
    CONTENT_POLICY: string;
    RATE_LIMITED: string;
    NETWORK_ERROR: string;
    UNKNOWN: string;
  };
};
