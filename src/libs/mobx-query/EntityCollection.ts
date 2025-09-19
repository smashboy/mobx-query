/* eslint-disable react-hooks/rules-of-hooks */
import { action, computed, observable } from "mobx";
import {
  Entity,
  type EntityHydrated,
  type EntityHydratedInternal,
  type EntityHydrationCallback,
  type GetEntityIdCallback,
} from "./Entity";
import {
  hashKey,
  useMutation,
  useSuspenseQuery,
  type DefaultError,
  type QueryClient,
} from "@tanstack/react-query";
import {
  OptimisticMutationStrategy,
  type OptimisticMutationStrategyOptions,
} from "./OptimisticMutationStrategy";
import type { EntityId } from "./types";

const COLLECTION_ID_DECREMENTORS = new Map<string, number>();
const COLLECTIONS_REGISTRY = new Set<string>();
const CLIENT_ONLY_ENTITY_ID_PREFIX = "entityClientOnlyId_";

export type CreateEntityInputMapCallback<I, T> = (
  input: I,
  clientId: string
) => T;

export interface EntityCollectionOptions<T = unknown, S = unknown> {
  getEntityId: GetEntityIdCallback<T>;
  hydrate: EntityHydrationCallback<T, S>;
  generateId?: () => EntityId;
  strategyOptions?: OptimisticMutationStrategyOptions;
}

export abstract class EntityCollection<
  T = unknown,
  S = unknown,
  E extends EntityHydratedInternal<S> = EntityHydratedInternal<S>,
  EP extends EntityHydrated<S> = EntityHydrated<S>
> {
  private readonly collectionName: string;

  @observable private accessor collection = new Map<string, E>();
  @observable private accessor deletedRecordsIds = new Set<string>();
  @observable private accessor clientOnlyEntitiesIds = new Set<string>();

  private readonly options: EntityCollectionOptions<T, S>;
  private readonly queryClient: QueryClient;

  constructor(
    collectionName: string,
    queryClient: QueryClient,
    options: EntityCollectionOptions<T, S>
  ) {
    if (COLLECTIONS_REGISTRY.has(collectionName)) {
      throw new Error("Collection with this name already exists");
    }

    this.collectionName = collectionName;
    this.queryClient = queryClient;
    this.options = options;

    COLLECTIONS_REGISTRY.add(this.collectionName);
    COLLECTION_ID_DECREMENTORS.set(this.collectionName, 0);

    this.initQueryClientCacheListener();
  }

  @computed
  get clientOnlyEntities() {
    const entities = new Map<string, EP>();

    for (const entityId of this.clientOnlyEntitiesIds.values()) {
      const entity = this.collection.get(entityId);

      if (!entity) {
        continue;
      }

      entities.set(entityId, entity as unknown as EP);
    }

    return entities;
  }

  protected useSuspenseQueryEntity<A extends unknown[]>(
    query: (...args: A) => Promise<T>,
    ...args: A
  ) {
    if (!query.name) {
      throw new Error("Bad Query Callback");
    }

    const queryKey = this.createQueryKey(query.name, args);

    const res = useSuspenseQuery({
      queryKey,
      queryFn: async () => {
        const data = await query(...args);
        this.setEntity(data, hashKey(queryKey), true);
        return this.getEntityId(data);
      },
    });

    return this.collection.get(res.data)! as unknown as EP;
  }

  protected useSuspenseQueryEntitiesList<A extends unknown[]>(
    query: (...args: A) => T[] | Promise<T[]>,
    ...args: A
  ) {
    if (!query.name) {
      throw new Error("Bad Query Callback");
    }

    const queryKey = this.createQueryKey(query.name, args);

    const res = useSuspenseQuery({
      queryKey,
      queryFn: async () => {
        try {
          const data = await query(...args);
          this.setEntities(data, hashKey(queryKey));
          return data.map((item) => this.getEntityId(item));
        } catch (error) {
          console.error(error);
          return [];
        }
      },
    });

    const list: Array<E> = [];

    for (const id of res.data) {
      if (this.deletedRecordsIds.has(id)) {
        continue;
      }

      const entity = this.collection.get(id);

      if (entity) {
        list.push(entity);
      }
    }

    return list as unknown as EP[];
  }

  protected useCreateMutation<I>(
    mutationFn: (input: I) => Promise<void>,
    mapInput: CreateEntityInputMapCallback<I, T>
  ) {
    const mutationStrategy = new OptimisticMutationStrategy(
      this.queryClient,
      this.collectionName,
      void 0,
      this.options.strategyOptions
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
    const id = this.createCollectionEntityId();
    const data = mapInput(input, id);
    this.clientOnlyEntitiesIds.add(id);
    this.setEntity(data, id);
    return { entityId: id };
  }

  private onCreateMutationSuccess(entityId: string) {
    this.deleteEntity(entityId);
  }

  private onCreateMutationError(
    mutationStrategy: OptimisticMutationStrategy,
    entityId?: string
  ) {
    if (!entityId) {
      return;
    }

    const entity = this.collection.get(entityId);

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
      entity as unknown as E,
      this.options.strategyOptions
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

  @action private onDeleteMutationMutate(
    entity: EP,
    mutationStrategy: OptimisticMutationStrategy
  ) {
    mutationStrategy.onMutate();
    this.deletedRecordsIds.add(entity.entityId);
  }

  private onDeleteMutationSuccess(
    entity: EP,
    mutationStrategy: OptimisticMutationStrategy
  ) {
    this.deleteEntity(entity.entityId);
    mutationStrategy.onSuccess();
  }

  @action private onDeleteMutationError(
    entity: EP,
    mutationStrategy: OptimisticMutationStrategy
  ) {
    this.deletedRecordsIds.delete(entity.entityId);
    mutationStrategy.onError();
  }

  private getEntityId(data: T) {
    const id = this.options.getEntityId(data);

    return typeof id === "number" ? id.toString() : id;
  }

  @action private setEntity(
    entityData: T,
    queryHash: string,
    clearQueryHashes?: boolean
  ) {
    const id = this.getEntityId(entityData);

    const entity = this.collection.get(id);

    if (clearQueryHashes) {
      this.removeQueryHashFromAllEntities(queryHash);
    }

    if (entity) {
      const updatedEntity = entity._newEntity(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.options.hydrate(entityData),
        [queryHash]
      );

      this.collection.set(id, updatedEntity as never);
      return;
    }

    const newEntity = new Entity(
      id,
      this.options.hydrate(entityData),
      this.collectionName,
      this.queryClient,
      [queryHash],
      {
        onAllQueryHashesRemoved: (entityId: string) =>
          this.deleteEntity(entityId),
      }
    );

    this.collection.set(id, newEntity as never);
  }

  private setEntities(entities: T[], queryHash: string) {
    if (!Array.isArray(entities)) {
      throw new Error("Bad Array");
    }

    this.removeQueryHashFromAllEntities(queryHash);

    for (const entity of entities) {
      this.setEntity(entity, queryHash);
    }
  }

  @action private deleteEntity(entityId: string) {
    this.collection.delete(entityId);
    this.clientOnlyEntitiesIds.delete(entityId);
    this.deletedRecordsIds.delete(entityId);
  }

  private initQueryClientCacheListener() {
    this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "removed") {
        this.removeQueryHashFromAllEntities(event.query.queryHash);
      }
    });
  }

  private removeQueryHashFromAllEntities(hash: string) {
    for (const entity of this.collection.values()) {
      entity._removeQueryHash(hash);
    }
  }

  private createCollectionEntityId(): string {
    if (this.options.generateId) {
      const id = this.options.generateId();
      return typeof id === "number" ? id.toString() : id;
    }

    let id = COLLECTION_ID_DECREMENTORS.get(this.collectionName)!;
    id--;
    COLLECTION_ID_DECREMENTORS.set(this.collectionName, id);
    return `${CLIENT_ONLY_ENTITY_ID_PREFIX}(${id})`;
  }

  private createQueryKey<A extends unknown[]>(fnName: string, ...args: A) {
    return [this.collectionName, fnName, ...args.flat()];
  }
}
