/*
 * Global declarations for WhatsApp Web injected objects
 */

declare global {
  interface Window {
    WAPI: any;
    Store: any;
    WPP: any;
  }
}

export {};
