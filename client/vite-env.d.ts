/// <reference types="vite/client" />

declare global {
  interface Window {
    oauthDeepLinkListenerRegistered?: boolean;
  }
}
