export type EntityId = string | number;
export type EntityState = "pending" | "confirmed" | "failed";

export type GetEntityIdCallback<T = unknown> = (entity: T) => EntityId;
export type EntityHydrationCallback<T = unknown, S = unknown> = (
  entity: T
) => S;
export type CreateEntityInputMapCallback<I, T> = (
  input: I,
  clientId: string
) => T;
