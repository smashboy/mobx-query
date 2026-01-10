/* eslint-disable react-hooks/rules-of-hooks */
import {
  hashKey,
  useMutation,
  useSuspenseQuery,
  type DefaultError,
  type QueryClient,
} from "@tanstack/react-query";
import type { CollectionManager } from "./CollectionManager";
import type { EntityHydrated, EntityHydratedInternal } from "./Entity";
import type {
  CreateEntityInputMapCallback,
  UseEntityQueryFunction,
  UseEntityListQueryFunction,
  UseSuspenseQueryHookCommonOptions,
  GenerateEntityIdCallback,
  UseDeleteMutationHookOptions,
  OptimisticMutationStrategyOptions,
  UseCreateMutationHookOptions,
  CreateMutationContext,
  CreateMutationOnMutateCallback,
  CreateMutationOnSuccessCallback,
  CreateMutationOnErrorCallback,
  DeleteMutationOnMutateCallback,
  DeleteMutationOnSuccessCallback,
  DeleteMutationOnErrorCallback,
} from "./types";
import { action } from "mobx";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import { CollectionIdGenerator } from "./CollectionIdGenerator";
import { invalidateQueryByHash } from "./utils";

export interface CreateSuspenseEntityQueryReturnCommon<TArguments = unknown> {
  invalidate: (args?: TArguments) => void;
  prefetch: (args: TArguments) => void;
  ensureData: (args: TArguments) => void;
  baseQueryKeyHash: string;
}

export interface CreateSuspenseEntityQueryReturn<
  THydrated = unknown,
  TArguments = unknown,
  TError = DefaultError,
  THydratedEntity extends EntityHydrated<THydrated> = EntityHydrated<THydrated>
> extends CreateSuspenseEntityQueryReturnCommon<TArguments> {
  useEntityQuery: (
    args: TArguments,
    options?: UseSuspenseQueryHookCommonOptions<string, TError>
  ) => THydratedEntity;
}

export interface CreateSuspenseEntityListQueryReturn<
  THydrated = unknown,
  TArguments = unknown,
  TError = DefaultError,
  THydratedEntity extends EntityHydrated<THydrated> = EntityHydrated<THydrated>
> extends CreateSuspenseEntityQueryReturnCommon<TArguments> {
  useEntityListQuery: (
    args: TArguments,
    options?: UseSuspenseQueryHookCommonOptions<string, TError>
  ) => THydratedEntity[];
}

export class CollectionHooksManager<
  TData = unknown,
  THydrated = unknown,
  THydratedEntityInternal extends EntityHydratedInternal<THydrated> = EntityHydratedInternal<THydrated>,
  THydratedEntity extends EntityHydrated<THydrated> = EntityHydrated<THydrated>
> {
  private readonly collectionName: string;
  private readonly queryClient: QueryClient;
  private readonly collectionManger: CollectionManager<
    TData,
    THydrated,
    THydratedEntityInternal
  >;
  private readonly collectionIdGenerator: CollectionIdGenerator;
  private readonly collectionOptimisticMutationStrategyOptions?: OptimisticMutationStrategyOptions;

  constructor(
    collectionName: string,
    queryClient: QueryClient,
    collectionManger: CollectionManager<
      TData,
      THydrated,
      THydratedEntityInternal
    >,
    generateId?: GenerateEntityIdCallback,
    collectionOptimisticMutationStrategyOptions?: OptimisticMutationStrategyOptions
  ) {
    this.collectionName = collectionName;
    this.queryClient = queryClient;
    this.collectionManger = collectionManger;
    this.collectionOptimisticMutationStrategyOptions =
      collectionOptimisticMutationStrategyOptions;
    this.collectionIdGenerator = new CollectionIdGenerator(
      this.collectionName,
      generateId
    );
  }

  createSuspenseEntityQuery<TArguments = unknown, TError = DefaultError>(
    queryFn: UseEntityQueryFunction<TArguments, TData>
  ): CreateSuspenseEntityQueryReturn<
    THydrated,
    TArguments,
    TError,
    THydratedEntity
  > {
    if (!queryFn.name) {
      throw new Error("Bad Query Callback");
    }

    const baseQueryKeyHash = hashKey(this.createQueryBaseKey(queryFn.name));

    const handleQueryFn = async (args: TArguments, queryKey: unknown[]) => {
      const data = await queryFn(args);
      this.collectionManger.setEntity(data, hashKey(queryKey), true);
      return this.collectionManger.getEntityId(data);
    };

    return {
      baseQueryKeyHash,
      useEntityQuery: (
        args: TArguments,
        options?: UseSuspenseQueryHookCommonOptions<string, TError>
      ) => {
        const queryKey = this.createQueryKey(queryFn.name, args);

        const res = useSuspenseQuery<string, TError>({
          queryKey,
          queryFn: () => handleQueryFn(args, queryKey),
          gcTime: options?.gcTime,
          // staleTime: options.staleTime,
          meta: options?.meta,
          networkMode: options?.networkMode,
          retry: options?.retry,
          retryOnMount: options?.retryOnMount,
          retryDelay: options?.retryDelay,
          // refetchInterval: options.refetchInterval,
          // refetchOnMount: options.refetchOnMount,
          // refetchOnReconnect: options.refetchOnReconnect,
          // refetchOnWindowFocus: options.refetchOnWindowFocus
          refetchIntervalInBackground: options?.refetchIntervalInBackground,
        });

        return this.collectionManger.collection.get(
          res.data
        )! as unknown as THydratedEntity;
      },
      prefetch: (args: TArguments) => {
        const queryKey = this.createQueryKey(queryFn.name, args);
        this.queryClient.prefetchQuery({
          queryKey,
          queryFn: () => handleQueryFn(args, queryKey),
        });
      },
      ensureData: (args: TArguments) => {
        const queryKey = this.createQueryKey(queryFn.name, args);
        this.queryClient.ensureQueryData({
          queryKey,
          queryFn: () => handleQueryFn(args, queryKey),
        });
      },
      invalidate: (args?: TArguments) =>
        invalidateQueryByHash(
          hashKey(this.createQueryKey(queryFn.name, args)),
          this.queryClient.getQueryCache()
        ),
    };
  }

  createSuspenseEntityListQuery<TArguments = unknown, TError = DefaultError>(
    queryFn: UseEntityListQueryFunction<TArguments, TData>
  ): CreateSuspenseEntityListQueryReturn<
    THydrated,
    TArguments,
    TError,
    THydratedEntity
  > {
    if (!queryFn.name) {
      throw new Error("Bad Query Callback");
    }

    const baseQueryKeyHash = hashKey(this.createQueryBaseKey(queryFn.name));

    const handleQueryFn = async (args: TArguments, queryKey: unknown[]) => {
      const data = await queryFn(args);
      this.collectionManger.setEntities(data, hashKey(queryKey));
      return data.map((item) => this.collectionManger.getEntityId(item));
    };

    return {
      baseQueryKeyHash,
      useEntityListQuery: (args, options) => {
        const queryKey = this.createQueryKey(queryFn.name, args);

        const res = useSuspenseQuery({
          queryKey,
          queryFn: () => handleQueryFn(args, queryKey),
          gcTime: options?.gcTime,
          // staleTime: options.staleTime,
          meta: options?.meta,
          networkMode: options?.networkMode,
          retry: options?.retry,
          retryOnMount: options?.retryOnMount,
          retryDelay: options?.retryDelay,
          // refetchInterval: options?.refetchInterval,
          // refetchOnMount: options?.refetchOnMount,
          // refetchOnReconnect: options?.refetchOnReconnect,
          // refetchOnWindowFocus: options?.refetchOnWindowFocus
          refetchIntervalInBackground: options?.refetchIntervalInBackground,
        });

        const list: Array<THydratedEntityInternal> = [];

        for (const id of res.data) {
          if (this.collectionManger.deletedRecordIds.has(id)) {
            continue;
          }

          const entity = this.collectionManger.collection.get(id);

          if (entity) {
            list.push(entity);
          }
        }

        return list as unknown as THydratedEntity[];
      },
      prefetch: (args: TArguments) => {
        const queryKey = this.createQueryKey(queryFn.name, args);
        this.queryClient.prefetchQuery({
          queryKey,
          queryFn: () => handleQueryFn(args, queryKey),
        });
      },
      ensureData: (args: TArguments) => {
        const queryKey = this.createQueryKey(queryFn.name, args);
        this.queryClient.ensureQueryData({
          queryKey,
          queryFn: () => handleQueryFn(args, queryKey),
        });
      },
      invalidate: (args?: TArguments) =>
        invalidateQueryByHash(
          hashKey(this.createQueryKey(queryFn.name, args)),
          this.queryClient.getQueryCache()
        ),
    };
  }

  useCreateMutation<TInput, TError = DefaultError, TContext = unknown>(
    mutationFn: (input: TInput) => Promise<void>,
    mapInput: CreateEntityInputMapCallback<TInput, TData>,
    options?: UseCreateMutationHookOptions<
      THydratedEntity,
      TError,
      TContext,
      TInput
    >
  ) {
    const mutation = useMutation<
      void,
      TError,
      TInput,
      CreateMutationContext<
        TInput,
        TContext,
        THydratedEntityInternal,
        OptimisticMutationStrategy
      >
    >({
      mutationFn: (input) => mutationFn(input),
      onMutate: (input) =>
        this.onCreateMutationMutate(input, mapInput, options?.onMutate),
      onSuccess: (_data, input, context) => {
        // onCreateMutationMutate always returns a context object, so context is guaranteed to exist here
        // If onMutate throws, React Query calls onError instead of onSuccess
        if (!context) {
          console.error(
            "onCreateMutationSuccess called without context - this should not happen"
          );
          return;
        }
        this.onCreateMutationSuccess(input, context, options?.onSuccess);
      },
      onError: (error, input, context) =>
        this.onCreateMutationError(error, input, context, options?.onError),
      onSettled: (_data, error, input, context) => {
        if (options?.onSettled && context) {
          options.onSettled(
            input,
            context.entity as unknown as THydratedEntity,
            error ?? null,
            context.userContext
          );
        }
      },
      gcTime: options?.gcTime,
      meta: options?.meta,
      networkMode: options?.networkMode,
      retry: options?.retry,
      retryDelay: options?.retryDelay,
      scope: options?.scope,
      throwOnError: options?.throwOnError,
    });

    const create = (input: TInput) => mutation.mutate(input);

    return create;
  }

  @action private async onCreateMutationMutate<TInput, TContext = unknown>(
    input: TInput,
    mapInput: CreateEntityInputMapCallback<TInput, TData>,
    onMutate?: CreateMutationOnMutateCallback<THydratedEntity, TContext, TInput>
  ): Promise<
    CreateMutationContext<
      TInput,
      TContext,
      THydratedEntityInternal,
      OptimisticMutationStrategy
    >
  > {
    const id = this.collectionIdGenerator.generateEntityId();
    const data = mapInput(input, id);
    this.collectionManger.clientOnlyEntityIds.add(id);
    const entity = this.collectionManger.setEntity(
      data
    ) as THydratedEntityInternal;

    const mutationStrategy = new OptimisticMutationStrategy(
      entity,
      this.queryClient,
      this.collectionName,
      this.collectionOptimisticMutationStrategyOptions
    );

    mutationStrategy.onMutate();

    const entityAsHydrated = entity as unknown as THydratedEntity;
    const userContext = onMutate
      ? (await onMutate(input, entityAsHydrated)) ?? undefined
      : undefined;

    return {
      entityId: id,
      input,
      entity,
      mutationStrategy,
      userContext,
    };
  }

  private onCreateMutationSuccess<TInput, TContext = unknown>(
    input: TInput,
    context: CreateMutationContext<
      TInput,
      TContext,
      THydratedEntityInternal,
      OptimisticMutationStrategy
    >,
    onSuccess?: CreateMutationOnSuccessCallback<
      THydratedEntity,
      TContext,
      TInput
    >
  ) {
    this.collectionManger.deleteEntity(context.entityId);
    context.mutationStrategy.onSuccess();
    onSuccess?.(
      input,
      context.entity as unknown as THydratedEntity,
      context.userContext
    );
  }

  private onCreateMutationError<
    TInput,
    TError = DefaultError,
    TContext = unknown
  >(
    error: TError,
    input: TInput,
    context:
      | CreateMutationContext<
          TInput,
          TContext,
          THydratedEntityInternal,
          OptimisticMutationStrategy
        >
      | undefined,
    onError?: CreateMutationOnErrorCallback<
      THydratedEntity,
      TError,
      TContext,
      TInput
    >
  ) {
    if (!context) {
      // Error happened before onMutate completed
      return;
    }

    const strategy = context.mutationStrategy.getMutationErrorStrategy();
    context.mutationStrategy.onError();

    if (strategy === "rollback") {
      this.collectionManger.deleteEntity(context.entityId);
    }

    onError?.(
      error,
      input,
      context.entity as unknown as THydratedEntity,
      context.userContext
    );
  }

  useDeleteMutation<TError = DefaultError, TContext = unknown>(
    entity: THydratedEntity,
    mutationFn: (entity: THydratedEntity) => Promise<void>,
    options?: UseDeleteMutationHookOptions<THydratedEntity, TError, TContext>
  ) {
    const mutationStrategy = new OptimisticMutationStrategy(
      entity as unknown as THydratedEntityInternal,
      this.queryClient,
      this.collectionName,
      this.collectionOptimisticMutationStrategyOptions,
      {
        invalidationStrategy: options?.invalidationStrategy,
        onMutationErrorStrategy: options?.onMutationErrorStrategy,
      }
    );

    const mutation = useMutation<void, TError, void, TContext | undefined>({
      mutationFn: () => mutationFn(entity),
      onMutate: async () =>
        this.onDeleteMutationMutate(
          entity,
          mutationStrategy,
          options?.onMutate
        ),
      onSuccess: (_data, _variables, context) =>
        this.onDeleteMutationSuccess(
          entity,
          mutationStrategy,
          context,
          options?.onSuccess
        ),
      onError: (error, _variables, context) =>
        this.onDeleteMutationError(
          entity,
          mutationStrategy,
          error,
          context,
          options?.onError
        ),
      onSettled: (_data, error, _variables, context) =>
        options?.onSettled?.(entity, error ?? null, context),
      gcTime: options?.gcTime,
      meta: options?.meta,
      networkMode: options?.networkMode,
      retry: options?.retry,
      retryDelay: options?.retryDelay,
      scope: options?.scope,
      throwOnError: options?.throwOnError,
    });

    const deleteEntity = () => mutation.mutate();

    return deleteEntity;
  }

  @action async onDeleteMutationMutate<TContext = unknown>(
    entity: THydratedEntity,
    mutationStrategy: OptimisticMutationStrategy,
    onMutate?: DeleteMutationOnMutateCallback<THydratedEntity, TContext>
  ): Promise<TContext | undefined> {
    this.collectionManger.deletedRecordIds.add(entity.entityId);
    mutationStrategy.onMutate();

    if (onMutate) {
      return (await onMutate(entity)) ?? undefined;
    }

    return undefined;
  }

  private onDeleteMutationSuccess<TContext = unknown>(
    entity: THydratedEntity,
    mutationStrategy: OptimisticMutationStrategy,
    context: TContext | undefined,
    onSuccess?: DeleteMutationOnSuccessCallback<THydratedEntity, TContext>
  ) {
    this.collectionManger.deleteEntity(entity.entityId);
    mutationStrategy.onSuccess();
    onSuccess?.(entity, context);
  }

  @action private onDeleteMutationError<
    TError = DefaultError,
    TContext = unknown
  >(
    entity: THydratedEntity,
    mutationStrategy: OptimisticMutationStrategy,
    error: TError,
    context: TContext | undefined,
    onError?: DeleteMutationOnErrorCallback<THydratedEntity, TError, TContext>
  ) {
    this.collectionManger.deletedRecordIds.delete(entity.entityId);
    mutationStrategy.onError();
    onError?.(error, entity, context);
  }

  private createQueryKey<TArguments = unknown>(
    fnName: string,
    args: TArguments
  ) {
    return [this.collectionName, fnName, args];
  }

  private createQueryBaseKey(fnName: string) {
    return [this.collectionName, fnName];
  }
}
