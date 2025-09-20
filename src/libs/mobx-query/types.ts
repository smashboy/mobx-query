import type {
  DefaultError,
  UseMutationOptions,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";

export type EntityId = string | number;
export type EntityState = "pending" | "confirmed" | "failed";

export type OptimisticMutationInvalidationStrategy =
  | "collection"
  | "related-queries"
  | "none";

export type OptimisticMutationErrorStrategy = "rollback" | "keep";

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

export interface OptimisticMutationStrategyOptions {
  invalidationStrategy?: OptimisticMutationInvalidationStrategy;
  onMutationErrorStrategy?: OptimisticMutationErrorStrategy;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UseSuspenseQueryHookCommonOptions<
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UseMutationHookCommonOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown
> extends Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn" | "mutationKey"
  > {}

export interface UseDeleteMutationHookOptions<
  TError = DefaultError,
  TContext = unknown
> extends UseMutationHookCommonOptions<void, TError, void, TContext>,
    OptimisticMutationStrategyOptions {}

export interface UseUpdateMutationHookOptions<
  TError = DefaultError,
  TContext = unknown
> extends UseMutationHookCommonOptions<void, TError, void, TContext>,
    OptimisticMutationStrategyOptions {}
