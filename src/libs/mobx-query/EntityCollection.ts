/* eslint-disable react-hooks/rules-of-hooks */
import { action, observable } from "mobx";
import {
  Entity,
  type EntityHydrated,
  type EntityHydratedInternal,
  type EntityHydratedInternalAny,
  type EntityHydrationCallback,
  type GetEntityIdCallback,
} from "./Entity";
import {
  hashKey,
  useMutation,
  useSuspenseQuery,
  type QueryClient,
} from "@tanstack/react-query";

const collectionIdDecrementors = new Map<string, number>();
const COLLECTIONS_REGISTRY = new Set<string>();

export interface EntityCollectionProps<T = unknown, S = unknown> {
  getEntityId: GetEntityIdCallback<T>;
  hydrate: EntityHydrationCallback<T, S>;
}

export abstract class EntityCollection<T = unknown, S = unknown> {
  private readonly collectionName: string;

  @observable private accessor collection = new Map<
    string,
    EntityHydratedInternal<S, T>
  >();
  @observable private accessor deletedRecords = new Set<string>();

  private readonly getEntityIdCallback: GetEntityIdCallback<T>;
  private readonly entityHydrationCallback: EntityHydrationCallback<T>;
  private readonly queryClient: QueryClient;

  constructor(
    collectionName: string,
    queryClient: QueryClient,
    options: EntityCollectionProps<T>
  ) {
    if (COLLECTIONS_REGISTRY.has(collectionName)) {
      throw new Error("Collection with this name already exists");
    }

    this.collectionName = collectionName;
    this.getEntityIdCallback = options.getEntityId;
    this.queryClient = queryClient;
    this.entityHydrationCallback = options.hydrate;

    COLLECTIONS_REGISTRY.add(this.collectionName);
    collectionIdDecrementors.set(this.collectionName, 0);

    this.initQueryClientCacheListener();
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

    return this.collection.get(res.data)! as EntityHydrated<T, S>;
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

    const list: Array<EntityHydratedInternal<S, T>> = [];

    for (const id of res.data) {
      if (this.deletedRecords.has(id)) {
        continue;
      }

      const entity = this.collection.get(id);

      if (entity) {
        list.push(entity);
      }
    }

    return list as EntityHydrated<T, S>[];
  }

  protected useCreateMutation() {}

  protected useDeleteMutation(
    entity: EntityHydrated<T, S>,
    mutationFn: (entity: EntityHydrated<T, S>) => Promise<void>
  ) {
    const mutation = useMutation({
      mutationFn: () => mutationFn(entity),
      onMutate: () => this.onDeleteMutationMutate(entity),
      onSuccess: () => this.onDeleteMutationSuccess(entity),
      onError: () => this.onDeleteMutationError(entity),
    });

    const deleteEntity = () => mutation.mutate();

    return deleteEntity;
  }

  @action private onDeleteMutationMutate(entity: EntityHydratedInternalAny) {
    this.queryClient.cancelQueries({ queryKey: [this.collectionName] });
    this.deletedRecords.add(entity.entityId);
  }

  @action private onDeleteMutationSuccess(entity: EntityHydratedInternalAny) {
    this.deletedRecords.delete(entity.entityId);
    this.collection.delete(entity.entityId);
    this.invalidateEntityRelatedQueries(entity);
  }

  @action private onDeleteMutationError(entity: EntityHydratedInternalAny) {
    this.deletedRecords.delete(entity.entityId);
  }

  private getEntityId(data: T) {
    const id = this.getEntityIdCallback(data);

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
        this.entityHydrationCallback(entityData),
        [queryHash]
      );

      this.collection.set(id, updatedEntity as never);
      return;
    }

    const newEntity = new Entity(
      this.entityHydrationCallback(entityData),
      id,
      this.collectionName,
      this.queryClient,
      [queryHash]
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

  private initQueryClientCacheListener() {
    this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "removed") {
        this.removeQueryHashFromAllEntities(event.query.queryHash);
      }
    });
  }

  private removeQueryHashFromAllEntities(hash: string) {
    for (const entity of this.collection.values()) {
      this.removeEntityQueryHash(hash, entity);
    }
  }

  @action private removeEntityQueryHash(
    hash: string,
    entity: EntityHydratedInternalAny
  ) {
    const isAllHashesRemoved = entity._removeQueryHash(hash);

    if (isAllHashesRemoved) {
      this.collection.delete(entity.entityId);
    }
  }

  private invalidateEntityRelatedQueries(entity: EntityHydratedInternalAny) {
    const cache = this.queryClient.getQueryCache();

    for (const hash of entity.queryHashes) {
      const query = cache.get(hash);
      if (query) {
        query.invalidate();
        if (query.isActive()) {
          query.fetch();
        }
      } else {
        this.removeEntityQueryHash(hash, entity);
      }
    }
  }

  private invalidateCollectionRelatedQueries() {
    this.queryClient.invalidateQueries({ queryKey: [this.collectionName] });
  }

  private createCollectionId(): string {
    let id = collectionIdDecrementors.get(this.collectionName)!;
    id--;
    collectionIdDecrementors.set(this.collectionName, id);
    return `entityClientOnlyId_(${id})`;
  }

  private createQueryKey<A extends unknown[]>(fnName: string, ...args: A) {
    return [this.collectionName, fnName, ...args.flat()];
  }
}
