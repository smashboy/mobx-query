import type { QueryClient } from "@tanstack/react-query";
import { action } from "mobx";
import type { EntityState } from "./types";

export type OptimisticMutationInvalidationStrategy =
  | "collection"
  | "related-queries"
  | "none";

export type OptimisticMutationErrorStrategy = "rollback" | "keep";

export interface OptimisticMutationStrategyOptions {
  invalidationStrategy?: OptimisticMutationInvalidationStrategy;
  onMutationErrorStrategy?: OptimisticMutationErrorStrategy;
}

export interface EntityLike {
  _removeQueryHash: (hash: string) => void;
  queryHashes: Set<string>;
  reset: () => void;
  state: EntityState;
}

export class OptimisticMutationStrategy {
  private readonly entity?: EntityLike;
  private readonly queryClient: QueryClient;
  private readonly collectionName: string;
  private readonly collectionOptions: Required<OptimisticMutationStrategyOptions>;
  private readonly mutationOptions?: OptimisticMutationStrategyOptions;

  constructor(
    queryClient: QueryClient,
    collectionName: string,
    entity?: EntityLike,
    collectionOptions?: OptimisticMutationStrategyOptions,
    mutationOptions?: OptimisticMutationStrategyOptions
  ) {
    this.entity = entity;
    this.queryClient = queryClient;
    this.collectionName = collectionName;

    this.collectionOptions = {
      invalidationStrategy:
        collectionOptions?.invalidationStrategy ?? "related-queries",
      onMutationErrorStrategy:
        collectionOptions?.onMutationErrorStrategy ?? "rollback",
    };
    this.mutationOptions = mutationOptions;
  }

  @action onMutate(entity?: EntityLike) {
    this.queryClient.cancelQueries({ queryKey: [this.collectionName] });
    entity = (entity ?? this.entity)!;
    entity.state = "pending";
  }

  @action onSuccess(entity?: EntityLike) {
    entity = (entity ?? this.entity)!;
    entity.state = "confirmed";
    const strategy = this.getInvalidationStrategy();
    switch (strategy) {
      case "collection":
        this.invalidateCollectionRelatedQueries();
        break;
      case "related-queries":
        this.invalidateEntityRelatedQueries(entity);
        break;
      default:
        break;
    }
  }

  @action onError(entity?: EntityLike) {
    entity = (entity ?? this.entity)!;
    entity.state = "failed";
    const strategy = this.getMutationErrorStrategy();

    if (strategy === "rollback") {
      entity.reset();
    }
  }

  private getInvalidationStrategy() {
    return (
      this.mutationOptions?.invalidationStrategy ??
      this.collectionOptions.invalidationStrategy
    );
  }

  private getMutationErrorStrategy() {
    return (
      this.mutationOptions?.onMutationErrorStrategy ??
      this.collectionOptions.onMutationErrorStrategy
    );
  }

  private invalidateCollectionRelatedQueries() {
    this.queryClient.invalidateQueries({ queryKey: [this.collectionName] });
  }

  private invalidateEntityRelatedQueries(entity?: EntityLike) {
    const cache = this.queryClient.getQueryCache();
    entity = (entity ?? this.entity)!;

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
}
