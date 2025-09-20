/* eslint-disable react-hooks/rules-of-hooks */
import { computed } from "mobx";
import { type EntityHydrated, type EntityHydratedInternal } from "./Entity";
import { type DefaultError, type QueryClient } from "@tanstack/react-query";
import type {
  EntityHydrationCallback,
  GetEntityIdCallback,
  UseEntityQueryFunction,
  UseEntityListQueryFunction,
  GenerateEntityIdCallback,
  OptimisticMutationStrategyOptions,
} from "./types";
import { CollectionManager } from "./CollectionManager";
import { CollectionHooksManager } from "./CollectionHooksManager";

export interface EntityCollectionOptions<TData = unknown, THydrated = unknown> {
  getEntityId: GetEntityIdCallback<TData>;
  hydrate: EntityHydrationCallback<TData, THydrated>;
  generateId?: GenerateEntityIdCallback;
  strategyOptions?: OptimisticMutationStrategyOptions;
}

export abstract class EntityCollection<
  TData = unknown,
  THydrated = unknown,
  THydratedEntityInternal extends EntityHydratedInternal<THydrated> = EntityHydratedInternal<THydrated>,
  THydratedEntity extends EntityHydrated<THydrated> = EntityHydrated<THydrated>
> {
  private readonly collectionManager: CollectionManager<
    TData,
    THydrated,
    THydratedEntityInternal
  >;
  private readonly hooksManager: CollectionHooksManager<
    TData,
    THydrated,
    THydratedEntityInternal,
    THydratedEntity
  >;

  constructor(
    collectionName: string,
    queryClient: QueryClient,
    options: EntityCollectionOptions<TData, THydrated>
  ) {
    this.collectionManager = new CollectionManager(
      collectionName,
      queryClient,
      options.hydrate,
      options.getEntityId
    );

    this.hooksManager = new CollectionHooksManager(
      collectionName,
      queryClient,
      this.collectionManager,
      options.generateId
    );
  }

  @computed
  get clientOnlyEntities() {
    const entities = new Map<string, THydratedEntity>();

    for (const entityId of this.collectionManager.clientOnlyEntitiesIds.values()) {
      const entity = this.collectionManager.collection.get(entityId);

      if (!entity) {
        continue;
      }

      entities.set(entityId, entity as unknown as THydratedEntity);
    }

    return entities;
  }

  createSuspenseEntityQuery<A = unknown, TError = DefaultError>(
    queryFn: UseEntityQueryFunction<A, TData>
  ) {
    return this.hooksManager.createSuspenseEntityQuery<A, TError>(queryFn);
  }

  createSuspenseEntityListQuery<A = unknown, TError = DefaultError>(
    queryFn: UseEntityListQueryFunction<A, TData>
  ) {
    return this.hooksManager.createSuspenseEntityListQuery<A, TError>(queryFn);
  }

  useDeleteMutation(
    entity: THydratedEntity,
    mutationFn: (entity: THydratedEntity) => Promise<void>
  ) {
    return this.hooksManager.useDeleteMutation(entity, mutationFn);
  }
}
