export const EntityState = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
} as const;

export type EntityState = (typeof EntityState)[keyof typeof EntityState];
