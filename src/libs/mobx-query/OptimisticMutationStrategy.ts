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
  private readonly entity: EntityLike;
  private readonly queryClient: QueryClient;
  private readonly collectionName: string;
  private readonly collectionOptions: Required<OptimisticMutationStrategyOptions>;
  private readonly mutationOptions?: OptimisticMutationStrategyOptions;

  constructor(
    entity: EntityLike,
    queryClient: QueryClient,
    collectionName: string,
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

  @action onMutate() {
    this.queryClient.cancelQueries({ queryKey: [this.collectionName] });
    this.entity.state = "pending";
  }

  @action onSuccess() {
    this.entity.state = "confirmed";
    const strategy = this.getInvalidationStrategy();
    switch (strategy) {
      case "collection":
        this.invalidateCollectionRelatedQueries();
        break;
      case "related-queries":
        this.invalidateEntityRelatedQueries();
        break;
      default:
        break;
    }
  }

  @action onError() {
    this.entity.state = "failed";
    const strategy = this.getMutationErrorStrategy();

    if (strategy === "rollback") {
      this.entity.reset();
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

  private invalidateEntityRelatedQueries() {
    const cache = this.queryClient.getQueryCache();

    for (const hash of this.entity.queryHashes) {
      const query = cache.get(hash);
      if (query) {
        query.invalidate();
        if (query.isActive()) {
          query.fetch();
        }
      } else {
        this.entity._removeQueryHash(hash);
      }
    }
  }
}
