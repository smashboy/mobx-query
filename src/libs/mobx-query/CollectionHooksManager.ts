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
import type { CreateEntityInputMapCallback } from "./types";
import { action } from "mobx";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import { CollectionIdGenerator } from "./CollectionIdGenerator";

export interface UseSuspenseQueryHooksCommonOptions<A extends unknown[]> {
  args: A;
}

export interface UseSuspenseEntityQueryHooksOptions<A extends unknown[], T>
  extends UseSuspenseQueryHooksCommonOptions<A> {
  queryFn: (...args: A) => Promise<T>;
}

export interface UseSuspenseEntitiesListQueryHooksOptions<
  A extends unknown[],
  T
> extends UseSuspenseQueryHooksCommonOptions<A> {
  queryFn: (...args: A) => Promise<T[]>;
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
    collectionManger: CollectionManager<T, S, E>
  ) {
    this.collectionName = collectionName;
    this.queryClient = queryClient;
    this.collectionManger = collectionManger;
    this.collectionIdGenerator = new CollectionIdGenerator(this.collectionName);
  }

  useSuspenseEntityQuery<A extends unknown[]>({
    queryFn,
    args,
  }: UseSuspenseEntityQueryHooksOptions<A, T>) {
    if (!queryFn.name) {
      throw new Error("Bad Query Callback");
    }

    const queryKey = this.createQueryKey(queryFn.name, args);

    const res = useSuspenseQuery({
      queryKey,
      queryFn: async () => {
        const data = await queryFn(...args);
        this.collectionManger.setEntity(data, hashKey(queryKey), true);
        return this.collectionManger.getEntityId(data);
      },
    });

    return this.collectionManger.collection.get(res.data)! as unknown as EP;
  }

  useSuspenseQueryEntitiesList<A extends unknown[]>({
    queryFn,
    args,
  }: UseSuspenseEntitiesListQueryHooksOptions<A, T>) {
    if (!queryFn.name) {
      throw new Error("Bad Query Callback");
    }

    const queryKey = this.createQueryKey(queryFn.name, args);

    const res = useSuspenseQuery({
      queryKey,
      queryFn: async () => {
        try {
          const data = await queryFn(...args);
          this.collectionManger.setEntities(data, hashKey(queryKey));
          return data.map((item) => this.collectionManger.getEntityId(item));
        } catch (error) {
          console.error(error);
          return [];
        }
      },
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

  protected useDeleteMutation(
    entity: EP,
    mutationFn: (entity: EP) => Promise<void>
  ) {
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
}
