/* eslint-disable react-hooks/rules-of-hooks */
import { action, observable } from "mobx";
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
  type QueryClient,
} from "@tanstack/react-query";
import {
  MutationUpdateStrategy,
  type MutationUpdateStrategyOptions,
} from "./MutationUpdateStrategy";

const collectionIdDecrementors = new Map<string, number>();
const COLLECTIONS_REGISTRY = new Set<string>();

export interface EntityCollectionOptions<T = unknown, S = unknown> {
  getEntityId: GetEntityIdCallback<T>;
  hydrate: EntityHydrationCallback<T, S>;
  strategyOptions?: MutationUpdateStrategyOptions;
}

export abstract class EntityCollection<
  T = unknown,
  S = unknown,
  E extends EntityHydratedInternal<S> = EntityHydratedInternal<S>,
  EP extends EntityHydrated<S> = EntityHydrated<S>
> {
  private readonly collectionName: string;

  @observable private accessor collection = new Map<string, E>();
  @observable private accessor deletedRecords = new Set<string>();

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
        this.setEntity(data, hashKey(queryKey));
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
      if (this.deletedRecords.has(id)) {
        continue;
      }

      const entity = this.collection.get(id);

      if (entity) {
        list.push(entity);
      }
    }

    return list as unknown as EP[];
  }

  protected useCreateMutation() {}

  protected useDeleteMutation(
    entity: EP,
    mutationFn: (entity: EP) => Promise<void>
  ) {
    const mutationStrategy = new MutationUpdateStrategy(
      {
        collection: () => this.invalidateCollectionRelatedQueries(),
        "related-queries": () =>
          this.invalidateEntityRelatedQueries(entity as unknown as E),
      },
      {
        rollback: () => this.onDeleteMutationError(entity),
        keep: () => {},
      },
      this.options.strategyOptions
    );

    const mutation = useMutation({
      mutationFn: () => mutationFn(entity),
      onMutate: () => this.onDeleteMutationMutate(entity),
      onSuccess: () => this.onDeleteMutationSuccess(entity, mutationStrategy),
      onError: () => mutationStrategy.onError(),
    });

    const deleteEntity = () => mutation.mutate();

    return deleteEntity;
  }

  @action private onDeleteMutationMutate(entity: EP) {
    this.queryClient.cancelQueries({ queryKey: [this.collectionName] });
    this.deletedRecords.add(entity.entityId);
  }

  private onDeleteMutationSuccess(
    entity: EP,
    strategy: MutationUpdateStrategy
  ) {
    this.deleteEntity(entity.entityId);
    strategy.onInvalidate();
  }

  @action private onDeleteMutationError(entity: EP) {
    this.deletedRecords.delete(entity.entityId);
  }

  private getEntityId(data: T) {
    const id = this.options.getEntityId(data);

    return typeof id === "number" ? id.toString() : id;
  }

  @action private setEntity(
    entityData: T,
    queryHash: string
    // clearQueryHashes?: boolean
  ) {
    const id = this.getEntityId(entityData);

    const entity = this.collection.get(id);

    // if (clearQueryHashes) {
    //   this.removeQueryHashFromAllEntities(queryHash);
    // }

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

    // this.removeQueryHashFromAllEntities(queryHash);

    for (const entity of entities) {
      this.setEntity(entity, queryHash);
    }
  }

  @action private deleteEntity(entityId: string) {
    this.collection.delete(entityId);
    this.deletedRecords.delete(entityId);
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

  private invalidateEntityRelatedQueries(entity: E) {
    const cache = this.queryClient.getQueryCache();

    for (const hash of entity.queryHashes) {
      const query = cache.get(hash);
      if (query) {
        query.invalidate();
        if (query.isActive()) {
          query.fetch();
        }
      } else {
        entity._removeQueryHash(hash);
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
