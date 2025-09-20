import { action, observable } from "mobx";
import { Entity, type EntityHydratedInternal } from "./Entity";
import type { QueryClient } from "@tanstack/react-query";
import type {
  EntityHydrationCallback,
  GetEntityIdCallback,
  OptimisticMutationStrategyOptions,
} from "./types";

const COLLECTIONS_REGISTRY = new Set<string>();

export class CollectionManager<
  TData = unknown,
  THydrated = unknown,
  THydratedEntityInternal extends EntityHydratedInternal<THydrated> = EntityHydratedInternal<THydrated>
> {
  @observable accessor collection = new Map<string, THydratedEntityInternal>();
  @observable accessor deletedRecordsIds = new Set<string>();
  @observable accessor clientOnlyEntitiesIds = new Set<string>();

  private readonly collectionName: string;
  private readonly queryClient: QueryClient;
  private readonly collectionOptimisticMutationStrategyOptions?: OptimisticMutationStrategyOptions;

  private readonly hydrateEntityCallback: EntityHydrationCallback<
    TData,
    THydrated
  >;
  private readonly getEntityIdCallback: GetEntityIdCallback<TData>;

  constructor(
    collectionName: string,
    queryClient: QueryClient,
    hydrateEntityCallback: EntityHydrationCallback<TData, THydrated>,
    getEntityIdCallback: GetEntityIdCallback<TData>,
    collectionOptimisticMutationStrategyOptions?: OptimisticMutationStrategyOptions
  ) {
    if (COLLECTIONS_REGISTRY.has(collectionName)) {
      throw new Error("Collection with this name already exists");
    }

    this.collectionName = collectionName;
    this.queryClient = queryClient;
    this.hydrateEntityCallback = hydrateEntityCallback;
    this.getEntityIdCallback = getEntityIdCallback;
    this.collectionOptimisticMutationStrategyOptions =
      collectionOptimisticMutationStrategyOptions;

    COLLECTIONS_REGISTRY.add(this.collectionName);

    this.initQueryClientCacheListener();
  }

  getEntityId(data: TData) {
    const id = this.getEntityIdCallback(data);

    return typeof id === "number" ? id.toString() : id;
  }

  @action setEntity(
    entityData: TData,
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
        this.hydrateEntityCallback(entityData),
        [queryHash]
      );

      this.collection.set(id, updatedEntity as never);
      return updatedEntity;
    }

    const newEntity = new Entity(
      id,
      this.hydrateEntityCallback(entityData),
      this.collectionName,
      this.queryClient,
      [queryHash],
      {
        onAllQueryHashesRemoved: (entityId: string) =>
          this.deleteEntity(entityId),
      },
      this.collectionOptimisticMutationStrategyOptions
    );

    this.collection.set(id, newEntity as never);
    return newEntity;
  }

  setEntities(entities: TData[], queryHash: string) {
    if (!Array.isArray(entities)) {
      throw new Error("Bad Array");
    }

    this.removeQueryHashFromAllEntities(queryHash);

    for (const entity of entities) {
      this.setEntity(entity, queryHash);
    }
  }

  @action deleteEntity(entityId: string) {
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
}
