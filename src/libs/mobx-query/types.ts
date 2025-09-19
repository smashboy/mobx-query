import type {
  DefaultError,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";

export type EntityId = string | number;
export type EntityState = "pending" | "confirmed" | "failed";

export type GenerateEntityIdCallback = () => EntityId;
export type GetEntityIdCallback<T = unknown> = (entity: T) => EntityId;
export type EntityHydrationCallback<T = unknown, S = unknown> = (
  entity: T
) => S;
export type CreateEntityInputMapCallback<I, T> = (
  input: I,
  clientId: string
) => T;

export type UseEntityQueryFunction<A = unknown, T = unknown> = (
  args: A
) => T | Promise<T>;
export type UseEntityListQueryFunction<A = unknown, T = unknown> = (
  args: A
) => T[] | Promise<T[]>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UseSuspenseQueryHooksCommonOptions<
  TQueryFnData = unknown,
  TError = DefaultError
> extends Pick<
    UseSuspenseQueryOptions<TQueryFnData, TError>,
    | "gcTime"
    | "staleTime"
    | "meta"
    | "networkMode"
    | "retry"
    | "retryOnMount"
    | "retryDelay"
    | "refetchInterval"
    | "refetchIntervalInBackground"
    | "refetchOnMount"
    | "refetchOnReconnect"
    | "refetchOnWindowFocus"
  > {}
