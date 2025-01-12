interface PhantomSolana {
  disconnect(): Promise<void>;
}

declare module '@phantom/solana' {
  interface Window {
    phantom?: {
      solana?: PhantomSolana;
    };
    solana?: PhantomSolana;
  }
}

export {}; 