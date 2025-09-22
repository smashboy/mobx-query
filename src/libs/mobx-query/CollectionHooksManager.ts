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
} from "./types";
import { action } from "mobx";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import { CollectionIdGenerator } from "./CollectionIdGenerator";

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
      invalidate: (args?: TArguments) => {},
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
      try {
        const data = await queryFn(args);
        this.collectionManger.setEntities(data, hashKey(queryKey));
        return data.map((item) => this.collectionManger.getEntityId(item));
      } catch (error) {
        console.error(error);
        return [];
      }
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
      invalidate: (args?: TArguments) => {},
    };
  }

  useCreateMutation<TInput, TError = DefaultError, TContext = unknown>(
    mutationFn: (input: TInput) => Promise<void>,
    mapInput: CreateEntityInputMapCallback<TInput, TData>,
    options?: UseDeleteMutationHookOptions<TError, TContext>
  ) {
    const mutation = useMutation<
      void,
      DefaultError,
      TInput,
      { entityId: string; mutationStrategy: OptimisticMutationStrategy }
    >({
      mutationFn: (input) => mutationFn(input),
      onMutate: (input) =>
        this.onCreateMutationMutate(input, mapInput, options?.onMutate),
      onSuccess: (_data, _vars, mutationResult) =>
        this.onCreateMutationSuccess(
          mutationResult!.entityId,
          options?.onSuccess
        ),
      onError: (_err, _vars, mutationResult) => {
        this.onCreateMutationError(
          mutationResult!.entityId,
          mutationResult!.mutationStrategy,
          options?.onError
        );
      },
      onSettled: () => options?.onSettled?.(),
      gcTime: options?.gcTime,
      meta: options?.meta,
      networkMode: options?.networkMode,
      // @ts-expect-error: todo
      retry: options?.retry,
      // @ts-expect-error: todo
      retryDelay: options?.retryDelay,
      scope: options?.scope,
      // @ts-expect-error: todo
      throwOnError: options?.throwOnError,
    });

    const create = (input: TInput) => mutation.mutate(input);

    return create;
  }

  @action private onCreateMutationMutate<TInput>(
    input: TInput,
    mapInput: CreateEntityInputMapCallback<TInput, TData>,
    onMutate?: () => void
  ) {
    const id = this.collectionIdGenerator.generateEntityId();
    const data = mapInput(input, id);
    this.collectionManger.clientOnlyEntityIds.add(id);
    const entity = this.collectionManger.setEntity(data, id);

    const mutationStrategy = new OptimisticMutationStrategy(
      entity,
      this.queryClient,
      this.collectionName,
      this.collectionOptimisticMutationStrategyOptions
    );

    mutationStrategy.onMutate();
    onMutate?.();

    return { entityId: id, mutationStrategy };
  }

  private onCreateMutationSuccess(entityId: string, onSuccess?: () => void) {
    this.collectionManger.deleteEntity(entityId);
    onSuccess?.();
  }

  private onCreateMutationError(
    entityId: string,
    mutationStrategy: OptimisticMutationStrategy,
    onError?: () => void
  ) {
    const strategy = mutationStrategy.getMutationErrorStrategy();

    if (strategy === "rollback") {
      this.collectionManger.deleteEntity(entityId);
    }

    onError?.();
  }

  useDeleteMutation<TError = DefaultError, TContext = unknown>(
    entity: THydratedEntity,
    mutationFn: (entity: THydratedEntity) => Promise<void>,
    options?: UseDeleteMutationHookOptions<TError, TContext>
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

    const mutation = useMutation({
      mutationFn: () => mutationFn(entity),
      onMutate: () =>
        this.onDeleteMutationMutate(
          entity,
          mutationStrategy,
          options?.onMutate
        ),
      onSuccess: () =>
        this.onDeleteMutationSuccess(
          entity,
          mutationStrategy,
          options?.onSuccess
        ),
      onError: () =>
        this.onDeleteMutationError(entity, mutationStrategy, options?.onError),
      onSettled: () => options?.onSettled?.(),
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

  @action onDeleteMutationMutate(
    entity: THydratedEntity,
    mutationStrategy: OptimisticMutationStrategy,
    onMutate?: () => void
  ) {
    this.collectionManger.deletedRecordIds.add(entity.entityId);
    mutationStrategy.onMutate();
    onMutate?.();
  }

  private onDeleteMutationSuccess(
    entity: THydratedEntity,
    mutationStrategy: OptimisticMutationStrategy,
    onSuccess?: () => void
  ) {
    this.collectionManger.deleteEntity(entity.entityId);
    mutationStrategy.onSuccess();
    onSuccess?.();
  }

  @action private onDeleteMutationError(
    entity: THydratedEntity,
    mutationStrategy: OptimisticMutationStrategy,
    onError?: () => void
  ) {
    this.collectionManger.deletedRecordIds.delete(entity.entityId);
    mutationStrategy.onError();
    onError?.();
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
