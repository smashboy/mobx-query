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
  UseDeleteMutationHookOptions,
  CreateEntityInputMapCallback,
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
      options.generateId,
      options.strategyOptions
    );
  }

  @computed
  get clientOnlyEntities() {
    const entities = new Map<string, THydratedEntity>();

    for (const entityId of this.collectionManager.clientOnlyEntityIds.values()) {
      const entity = this.collectionManager.collection.get(entityId);

      if (!entity) {
        continue;
      }

      entities.set(entityId, entity as unknown as THydratedEntity);
    }

    return entities;
  }

  @computed
  get dirtyEntities() {
    const entities = new Map<string, THydratedEntity>();

    for (const [
      entityId,
      entity,
    ] of this.collectionManager.collection.entries()) {
      if (entity.isDirty) {
        entities.set(entityId, entity as unknown as THydratedEntity);
      }
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

  useCreateMutation<TInput, TError = DefaultError, TContext = unknown>(
    mutationFn: (input: TInput) => Promise<void>,
    mapInput: CreateEntityInputMapCallback<TInput, TData>,
    options?: UseDeleteMutationHookOptions<TError, TContext>
  ) {
    return this.hooksManager.useCreateMutation(mutationFn, mapInput, options);
  }

  useDeleteMutation<TError = DefaultError, TContext = unknown>(
    entity: THydratedEntity,
    mutationFn: (entity: THydratedEntity) => Promise<void>,
    options?: UseDeleteMutationHookOptions<TError, TContext>
  ) {
    return this.hooksManager.useDeleteMutation<TError, TContext>(
      entity,
      mutationFn,
      options
    );
  }
}
