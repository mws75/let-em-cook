export interface ClerkPublicMetadata {
  dbUserId?: number;
}

declare global {
  interface CustomJwtSessionClaims {
    publicMetadata?: ClerkPublicMetadata;
  }
}

export {};
