/* eslint-disable react-hooks/rules-of-hooks */
import {
  useSuspenseQuery,
  useMutation,
  QueryClient,
  hashKey,
} from "@tanstack/react-query";
import { action, observable } from "mobx";
import { ViewModel } from "mobx-utils";

export type EntityConstructor<T = unknown> = typeof Entity<T>;
export type EntityState = "pending" | "confirmed" | "failed";
export type EntityId = string | number;

export type GetEntityIdCallback<T = unknown> = (entity: T) => EntityId;
export type EntityHydrationCallback<T = unknown, S = unknown> = (
  entity: T
) => S;

const collectionIdDecrementors = new Map<string, number>();

export type EntityHydrated<T = unknown, S = unknown> = S & Entity<T>;

export class Entity<T = unknown> extends ViewModel<T> {
  entityId: string;
  @observable accessor state: EntityState = "confirmed";

  private queryClient: QueryClient;
  private collectionName: string;
  private readonly queryHashes = new Set<string>();

  constructor(
    entity: T,
    entityId: string,
    collectionName: string,
    queryClient: QueryClient,
    queryHashes: string[]
  ) {
    super(entity);
    this.entityId = entityId;
    this.collectionName = collectionName;
    this.queryClient = queryClient;
    for (const hash of queryHashes) {
      this.queryHashes.add(hash);
    }
  }

  useUpdateMutation(mutationFn: (draft: this) => Promise<T>) {
    if (!mutationFn.name) {
      throw new Error("Bad Mutation Callback");
    }

    const mutation = useMutation({
      mutationFn: async () => mutationFn(this),
      onMutate: () => {},
      onSuccess: () => {},
      onError: () => {},
    });

    const save = () => mutation.mutate();

    return save;
  }

  @action private onMutate() {
    this.queryClient.cancelQueries({ queryKey: [this.collectionName] });

    this.state = "pending";
  }

  @action private onSuccess() {
    // this._update(data);
  }

  @action private onError() {
    this.state = "failed";
    this.reset();
  }

  @action _update() {
    this.state = "confirmed";
  }

  _newEntity(entity: T, queryHashes: string[]) {
    for (const hash of this.queryHashes) {
      queryHashes.push(hash);
    }

    return new Entity(
      entity,
      this.entityId,
      this.collectionName,
      this.queryClient,
      queryHashes
    );
  }

  _removeQueryHash(hash: string) {
    this.queryHashes.delete(hash);

    return this.queryHashes.size === 0;
  }
}

const COLLECTIONS_REGISTRY = new Set<string>();

export interface EntityCollectionProps<T = unknown, S = unknown> {
  getEntityId: GetEntityIdCallback<T>;
  hydrate: EntityHydrationCallback<T, S>;
}

export abstract class EntityCollection<T = unknown, S = unknown> {
  private readonly collectionName: string;

  @observable private accessor collection = new Map<
    string,
    EntityHydrated<S, T>
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
    collectionIdDecrementors.set(this.collectionName, -1);

    this.initQueryClientCacheListener();
  }

  protected useSuspenseQueryEntity<A extends unknown[]>(
    query: (...args: A) => Promise<T>,
    ...args: A
  ): EntityHydrated<S, T> {
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

    return this.collection.get(res.data)!;
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

    const list: Array<EntityHydrated<S, T>> = [];

    for (const id of res.data) {
      if (this.deletedRecords.has(id)) {
        continue;
      }

      const entity = this.collection.get(id);

      if (entity) {
        list.push(entity);
      }
    }

    return list;
  }

  protected useCreateMutation() {}

  protected useDeleteMutation<
    Entity extends EntityHydrated<T, S> = EntityHydrated<T, S>
  >(entity: Entity, mutationFn: (entity: Entity) => Promise<void>) {
    const mutation = useMutation({
      mutationFn: async () => mutationFn(entity),
      onMutate: () => {
        this.queryClient.cancelQueries({ queryKey: [this.collectionName] });
        this.deletedRecords.add(entity.entityId);
      },
      onSuccess: () => {
        this.deletedRecords.delete(entity.entityId);
        this.collection.delete(entity.entityId);
      },
      onError: () => {
        this.deletedRecords.delete(entity.entityId);
      },
    });

    const deleteEntity = () => mutation.mutate();

    return deleteEntity;
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
      this.removeEntityQueryHash(queryHash);
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

    this.removeEntityQueryHash(queryHash);

    for (const entity of entities) {
      this.setEntity(entity, queryHash);
    }
  }

  private initQueryClientCacheListener() {
    this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "removed") {
        this.removeEntityQueryHash(event.query.queryHash);
      }
    });
  }

  @action private removeEntityQueryHash(hash: string) {
    for (const [id, entity] of this.collection.entries()) {
      const isAllHashesRemoved = entity._removeQueryHash(hash);

      if (isAllHashesRemoved) {
        this.collection.delete(id);
      }
    }
  }

  private decrementCollectionId(): number {
    let id = collectionIdDecrementors.get(this.collectionName)!;
    id--;
    collectionIdDecrementors.set(this.collectionName, id);
    return id;
  }

  private createQueryKey<A extends unknown[]>(fnName: string, ...args: A) {
    return [this.collectionName, fnName, ...args.flat()];
  }
}
