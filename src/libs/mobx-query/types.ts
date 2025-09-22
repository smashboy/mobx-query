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
export type GetEntityIdCallback<TData = unknown> = (data: TData) => EntityId;
export type EntityHydrationCallback<TData = unknown, THydrated = unknown> = (
  data: TData
) => THydrated;
export type CreateEntityInputMapCallback<TInput, TData> = (
  input: TInput,
  clientId: string
) => TData;

export type UseEntityQueryFunction<TArguments = unknown, TData = unknown> = (
  args: TArguments
) => TData | Promise<TData>;
export type UseEntityListQueryFunction<
  TArguments = unknown,
  TData = unknown
> = (args: TArguments) => TData[] | Promise<TData[]>;

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
    | "mutationFn"
    | "mutationKey"
    | "onSuccess"
    | "onError"
    | "onMutate"
    | "onSettled"
  > {
  // TODO
  onMutate?: () => void;
  onSuccess?: () => void;
  onError?: () => void;
  onSettled?: () => void;
}

export interface UseDeleteMutationHookOptions<
  TError = DefaultError,
  TContext = unknown
> extends UseMutationHookCommonOptions<void, TError, void, TContext>,
    OptimisticMutationStrategyOptions {}

export interface UseCreateMutationHookOptions<
  TError = DefaultError,
  TContext = unknown
> extends UseMutationHookCommonOptions<void, TError, void, TContext>,
    OptimisticMutationStrategyOptions {}

export interface UseUpdateMutationHookOptions<
  TError = DefaultError,
  TContext = unknown
> extends UseMutationHookCommonOptions<void, TError, void, TContext>,
    OptimisticMutationStrategyOptions {}
