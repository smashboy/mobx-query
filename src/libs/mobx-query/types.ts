import type {
  DefaultError,
  UseMutationOptions,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import type { EntityHydratedInternal } from "./Entity";

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
) => EntityHydratedInternal<THydrated>;
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

// Reusable mutation callback types for delete mutations
export type DeleteMutationOnMutateCallback<
  THydratedEntity = unknown,
  TContext = unknown
> = (entity: THydratedEntity) => TContext | Promise<TContext> | void;

export type DeleteMutationOnSuccessCallback<
  THydratedEntity = unknown,
  TContext = unknown
> = (entity: THydratedEntity, context: TContext | undefined) => void;

export type DeleteMutationOnErrorCallback<
  THydratedEntity = unknown,
  TError = DefaultError,
  TContext = unknown
> = (
  error: TError,
  entity: THydratedEntity,
  context: TContext | undefined
) => void;

export type DeleteMutationOnSettledCallback<
  THydratedEntity = unknown,
  TError = DefaultError,
  TContext = unknown
> = (
  entity: THydratedEntity,
  error: TError | null,
  context: TContext | undefined
) => void;

// Reusable mutation callback types for create mutations
export type CreateMutationOnMutateCallback<
  THydratedEntity = unknown,
  TContext = unknown,
  TInput = unknown
> = (
  input: TInput,
  entity: THydratedEntity
) => TContext | Promise<TContext> | void;

export type CreateMutationOnSuccessCallback<
  THydratedEntity = unknown,
  TContext = unknown,
  TInput = unknown
> = (
  input: TInput,
  entity: THydratedEntity,
  context: TContext | undefined
) => void;

export type CreateMutationOnErrorCallback<
  THydratedEntity = unknown,
  TError = DefaultError,
  TContext = unknown,
  TInput = unknown
> = (
  error: TError,
  input: TInput,
  entity: THydratedEntity,
  context: TContext | undefined
) => void;

export type CreateMutationOnSettledCallback<
  THydratedEntity = unknown,
  TError = DefaultError,
  TContext = unknown,
  TInput = unknown
> = (
  input: TInput,
  entity: THydratedEntity,
  error: TError | null,
  context: TContext | undefined
) => void;

// Mutation context types
export interface CreateMutationContext<
  TInput = unknown,
  TContext = unknown,
  THydratedEntityInternal = unknown,
  TMutationStrategy = unknown
> {
  entityId: string;
  input: TInput;
  entity: THydratedEntityInternal;
  mutationStrategy: TMutationStrategy;
  userContext: TContext | undefined;
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
  THydratedEntity = unknown,
  TError = DefaultError,
  TContext = unknown
> extends Omit<
      UseMutationHookCommonOptions<void, TError, void, TContext>,
      "onMutate" | "onSuccess" | "onError" | "onSettled"
    >,
    OptimisticMutationStrategyOptions {
  /**
   * Called before the mutation function is executed.
   * Receives the entity being deleted and can return additional context.
   * The returned context will be passed to onSuccess, onError, and onSettled.
   */
  onMutate?: DeleteMutationOnMutateCallback<THydratedEntity, TContext>;
  /**
   * Called when the mutation is successful.
   * Receives the entity that was deleted and the context from onMutate.
   */
  onSuccess?: DeleteMutationOnSuccessCallback<THydratedEntity, TContext>;
  /**
   * Called when the mutation fails.
   * Receives the error, the entity that was being deleted, and the context from onMutate.
   */
  onError?: DeleteMutationOnErrorCallback<THydratedEntity, TError, TContext>;
  /**
   * Called when the mutation is settled (either successful or failed).
   * Receives the entity, error (null if successful), and the context from onMutate.
   */
  onSettled?: DeleteMutationOnSettledCallback<
    THydratedEntity,
    TError,
    TContext
  >;
}

export interface UseCreateMutationHookOptions<
  THydratedEntity = unknown,
  TError = DefaultError,
  TContext = unknown,
  TInput = unknown
> extends Omit<
      UseMutationHookCommonOptions<void, TError, void, TContext>,
      "onMutate" | "onSuccess" | "onError" | "onSettled"
    >,
    OptimisticMutationStrategyOptions {
  /**
   * Called before the mutation function is executed.
   * Receives the input and the created entity, and can return additional context.
   * The returned context will be passed to onSuccess, onError, and onSettled.
   */
  onMutate?: CreateMutationOnMutateCallback<THydratedEntity, TContext, TInput>;
  /**
   * Called when the mutation is successful.
   * Receives the input, the entity that was created, and the context from onMutate.
   */
  onSuccess?: CreateMutationOnSuccessCallback<
    THydratedEntity,
    TContext,
    TInput
  >;
  /**
   * Called when the mutation fails.
   * Receives the error, input, the entity that was being created, and the context from onMutate.
   */
  onError?: CreateMutationOnErrorCallback<
    THydratedEntity,
    TError,
    TContext,
    TInput
  >;
  /**
   * Called when the mutation is settled (either successful or failed).
   * Receives the input, entity, error (null if successful), and the context from onMutate.
   */
  onSettled?: CreateMutationOnSettledCallback<
    THydratedEntity,
    TError,
    TContext,
    TInput
  >;
}

export interface UseUpdateMutationHookOptions<
  TError = DefaultError,
  TContext = unknown
> extends UseMutationHookCommonOptions<void, TError, void, TContext>,
    OptimisticMutationStrategyOptions {}
