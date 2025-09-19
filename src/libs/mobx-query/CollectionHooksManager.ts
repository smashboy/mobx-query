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
  UseSuspenseQueryHooksCommonOptions,
  GenerateEntityIdCallback,
} from "./types";
import { action } from "mobx";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import { CollectionIdGenerator } from "./CollectionIdGenerator";

// export interface UseSuspenseEntityQueryHooksOptions<
//   A extends unknown[],
//   T = unknown,
//   TError = DefaultError
// > extends UseSuspenseQueryHooksCommonOptions<T, TError> {
//   queryFn: (...args: A) => Promise<T>;
// }

// export interface UseSuspenseEntityListQueryHooksOptions<
//   A extends unknown[],
//   T = unknown,
//   TError = DefaultError
// > extends UseSuspenseQueryHooksCommonOptions<T, TError> {
//   queryFn: (...args: A) => Promise<T[]>;
// }

export interface CreateSuspenseEntityQueryReturnCommon<A = unknown> {
  invalidate: (args: A) => void;
  prefetch: (args: A) => void;
  baseQueryKeyHash: string;
}

export interface CreateSuspenseEntityQueryReturn<
  // T = unknown,
  S = unknown,
  A = unknown,
  TError = DefaultError,
  EP extends EntityHydrated<S> = EntityHydrated<S>
> extends CreateSuspenseEntityQueryReturnCommon<A> {
  useEntityQuery: (
    args: A,
    options?: UseSuspenseQueryHooksCommonOptions<string, TError>
  ) => EP;
}

export interface CreateSuspenseEntityListQueryReturn<
  // T = unknown,
  S = unknown,
  A = unknown,
  TError = DefaultError,
  EP extends EntityHydrated<S> = EntityHydrated<S>
> extends CreateSuspenseEntityQueryReturnCommon<A> {
  useEntityListQuery: (
    args: A,
    options?: UseSuspenseQueryHooksCommonOptions<string, TError>
  ) => EP[];
}

export class CollectionHooksManager<
  T = unknown,
  S = unknown,
  E extends EntityHydratedInternal<S> = EntityHydratedInternal<S>,
  EP extends EntityHydrated<S> = EntityHydrated<S>
> {
  private readonly collectionName: string;
  private readonly queryClient: QueryClient;
  private readonly collectionManger: CollectionManager<T, S, E>;
  private readonly collectionIdGenerator: CollectionIdGenerator;

  constructor(
    collectionName: string,
    queryClient: QueryClient,
    collectionManger: CollectionManager<T, S, E>,
    generateId?: GenerateEntityIdCallback
  ) {
    this.collectionName = collectionName;
    this.queryClient = queryClient;
    this.collectionManger = collectionManger;
    this.collectionIdGenerator = new CollectionIdGenerator(
      this.collectionName,
      generateId
    );
  }

  createSuspenseEntityQuery<A = unknown, TError = DefaultError>(
    // options: UseSuspenseEntityQueryHooksOptions<A, T, TError>
    queryFn: UseEntityQueryFunction<A, T>
  ): CreateSuspenseEntityQueryReturn<S, A, TError, EP> {
    if (!queryFn.name) {
      throw new Error("Bad Query Callback");
    }

    const baseQueryKeyHash = hashKey(this.createQueryBaseKey(queryFn.name));

    return {
      useEntityQuery: (
        args: A,
        options?: UseSuspenseQueryHooksCommonOptions<string, TError>
      ) => {
        const queryKey = this.createQueryKey(queryFn.name, args);

        const res = useSuspenseQuery<string, TError>({
          queryKey,
          queryFn: async () => {
            const data = await queryFn(args);
            this.collectionManger.setEntity(data, hashKey(queryKey), true);
            return this.collectionManger.getEntityId(data);
          },
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

        return this.collectionManger.collection.get(res.data)! as unknown as EP;
      },
      prefetch: (args?: A) => {},
      invalidate: (args?: A) => {},
      baseQueryKeyHash,
    };
  }

  createSuspenseEntityListQuery<A = unknown, TError = DefaultError>(
    queryFn: UseEntityListQueryFunction<A, T>
  ): CreateSuspenseEntityListQueryReturn<S, A, TError, EP> {
    if (!queryFn.name) {
      throw new Error("Bad Query Callback");
    }

    const baseQueryKeyHash = hashKey(this.createQueryBaseKey(queryFn.name));

    return {
      useEntityListQuery: (args, options) => {
        const queryKey = this.createQueryKey(queryFn.name, args);

        const res = useSuspenseQuery({
          queryKey,
          queryFn: async () => {
            try {
              const data = await queryFn(args);
              this.collectionManger.setEntities(data, hashKey(queryKey));
              return data.map((item) =>
                this.collectionManger.getEntityId(item)
              );
            } catch (error) {
              console.error(error);
              return [];
            }
          },
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

        const list: Array<E> = [];

        for (const id of res.data) {
          if (this.collectionManger.deletedRecordsIds.has(id)) {
            continue;
          }

          const entity = this.collectionManger.collection.get(id);

          if (entity) {
            list.push(entity);
          }
        }

        return list as unknown as EP[];
      },
      prefetch: (args?: A) => {},
      invalidate: (args?: A) => {},
      baseQueryKeyHash,
    };
  }

  useCreateMutation<I>(
    mutationFn: (input: I) => Promise<void>,
    mapInput: CreateEntityInputMapCallback<I, T>
  ) {
    const mutationStrategy = new OptimisticMutationStrategy(
      this.queryClient,
      this.collectionName,
      void 0
    );

    const mutation = useMutation<void, DefaultError, I, { entityId: string }>({
      mutationFn: (input) => mutationFn(input),
      onMutate: (input) => this.onCreateMutationMutate(input, mapInput),
      onSuccess: (data, vars, ctx) =>
        this.onCreateMutationSuccess(ctx.entityId),
      onError: (err, vars, ctx) =>
        this.onCreateMutationError(mutationStrategy, ctx?.entityId),
    });

    const create = (input: I) => mutation.mutate(input);

    return create;
  }

  @action private onCreateMutationMutate<I>(
    input: I,
    mapInput: CreateEntityInputMapCallback<I, T>
  ) {
    const id = this.collectionIdGenerator.generateEntityId();
    const data = mapInput(input, id);
    this.collectionManger.clientOnlyEntitiesIds.add(id);
    this.collectionManger.setEntity(data, id);
    return { entityId: id };
  }

  private onCreateMutationSuccess(entityId: string) {
    this.collectionManger.deleteEntity(entityId);
  }

  private onCreateMutationError(
    mutationStrategy: OptimisticMutationStrategy,
    entityId?: string
  ) {
    if (!entityId) {
      return;
    }

    const entity = this.collectionManger.collection.get(entityId);

    if (!entity) {
      return;
    }

    mutationStrategy.onError(entity);
  }

  useDeleteMutation(entity: EP, mutationFn: (entity: EP) => Promise<void>) {
    const mutationStrategy = new OptimisticMutationStrategy(
      this.queryClient,
      this.collectionName,
      entity as unknown as E
    );

    const mutation = useMutation({
      mutationFn: () => mutationFn(entity),
      onMutate: () => this.onDeleteMutationMutate(entity, mutationStrategy),
      onSuccess: () => this.onDeleteMutationSuccess(entity, mutationStrategy),
      onError: () => this.onDeleteMutationError(entity, mutationStrategy),
    });

    const deleteEntity = () => mutation.mutate();

    return deleteEntity;
  }

  @action onDeleteMutationMutate(
    entity: EP,
    mutationStrategy: OptimisticMutationStrategy
  ) {
    mutationStrategy.onMutate();
    this.collectionManger.deletedRecordsIds.add(entity.entityId);
  }

  private onDeleteMutationSuccess(
    entity: EP,
    mutationStrategy: OptimisticMutationStrategy
  ) {
    this.collectionManger.deleteEntity(entity.entityId);
    mutationStrategy.onSuccess();
  }

  @action private onDeleteMutationError(
    entity: EP,
    mutationStrategy: OptimisticMutationStrategy
  ) {
    this.collectionManger.deletedRecordsIds.delete(entity.entityId);
    mutationStrategy.onError();
  }

  private createQueryKey<A extends unknown[]>(fnName: string, ...args: A) {
    return [this.collectionName, fnName, ...args.flat()];
  }

  private createQueryBaseKey(fnName: string) {
    return [this.collectionName, fnName];
  }
}
