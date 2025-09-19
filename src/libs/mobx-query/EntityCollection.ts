/* eslint-disable react-hooks/rules-of-hooks */
import { computed } from "mobx";
import { type EntityHydrated, type EntityHydratedInternal } from "./Entity";
import { type QueryClient } from "@tanstack/react-query";
import { type OptimisticMutationStrategyOptions } from "./OptimisticMutationStrategy";
import type {
  EntityHydrationCallback,
  EntityId,
  GetEntityIdCallback,
} from "./types";
import { CollectionManager } from "./CollectionManager";
import { CollectionHooksManager } from "./CollectionHooksManager";

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
  private readonly collectionManager: CollectionManager<T, S, E>;
  private readonly hooksManager: CollectionHooksManager<T, S, E, EP>;

  constructor(
    collectionName: string,
    queryClient: QueryClient,
    options: EntityCollectionOptions<T, S>
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
      this.collectionManager
    );
  }

  @computed
  get clientOnlyEntities() {
    const entities = new Map<string, EP>();

    for (const entityId of this.collectionManager.clientOnlyEntitiesIds.values()) {
      const entity = this.collectionManager.collection.get(entityId);

      if (!entity) {
        continue;
      }

      entities.set(entityId, entity as unknown as EP);
    }

    return entities;
  }
}
