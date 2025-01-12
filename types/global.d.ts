declare global {
  interface Window {
    phantom?: {
      solana?: {
        disconnect(): Promise<void>;
      };
    };
    solana?: {
      disconnect(): Promise<void>;
    };
  }
}

export {}; 