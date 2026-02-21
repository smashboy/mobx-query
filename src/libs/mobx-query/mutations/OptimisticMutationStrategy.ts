import { __MOBX_QUERY__ } from "../client/MQClient";
import {
  type EntityConstructorAny,
  type EntityAny,
  EntityState,
} from "../entity";
import type { OptimisticMutationStrategyOptions } from "./types";
import { action } from "mobx";
import { invalidateQueryByHash } from "../utils";
import { MQClientAccessor } from "../client";
import {
  OptimisticMutationErrorStrategy,
  OptimisticMutationInvalidationStrategy,
} from "./constants";

export class OptimisticMutationStrategy extends MQClientAccessor {
  constructor(
    private readonly entityConstructor: EntityConstructorAny,
    private readonly entities: EntityAny[],
    private readonly options?: OptimisticMutationStrategyOptions,
  ) {
    super();
  }

  get invalidationStrategy() {
    return (
      this.options?.invalidationStrategy ??
      __MOBX_QUERY__.options.invalidationStrategy
    );
  }

  get mutationErrorStrategy() {
    return this.options?.errorStrategy ?? __MOBX_QUERY__.options.errorStrategy;
  }

  get invalidateOnError() {
    return (
      this.options?.invalidateOnError ??
      __MOBX_QUERY__.options.invalidateOnError
    );
  }

  @action onMutate() {
    this.queryClient.cancelQueries({ queryKey: [this.entityConstructor.name] });
    for (const entity of this.entities) {
      entity.state = EntityState.PENDING;
    }
  }

  @action onSuccess() {
    for (const entity of this.entities) {
      entity.state = EntityState.CONFIRMED;
    }
    this.runInvalidationStrategy();
  }

  @action onError(ignoreReset: boolean = false) {
    for (const entity of this.entities) {
      entity.state = EntityState.FAILED;

      if (
        this.mutationErrorStrategy ===
          OptimisticMutationErrorStrategy.ROLLBACK &&
        !ignoreReset
      ) {
        entity.reset();
      }
    }

    if (this.invalidateOnError) {
      this.runInvalidationStrategy();
    }
  }

  private runInvalidationStrategy() {
    const strategy = this.invalidationStrategy;

    switch (strategy) {
      case OptimisticMutationInvalidationStrategy.ALL_QUERIES:
        this.queryClient.invalidateQueries();
        break;
      case OptimisticMutationInvalidationStrategy.ALL_ENTITY_QUERIES:
        this.invalidateCollectionRelatedQueries();
        break;
      case OptimisticMutationInvalidationStrategy.REFERENCED_QUERIES:
        this.invalidateEntityRelatedQueries();
        break;
      default:
        break;
    }
  }

  private async invalidateCollectionRelatedQueries() {
    await this.queryClient
      .invalidateQueries({ queryKey: [this.entityConstructor.name] })
      .catch((err) => console.error(err));
  }

  private invalidateEntityRelatedQueries() {
    const cache = this.queryClient.getQueryCache();

    const entitiesByHash: Record<string, EntityAny[]> = {};

    for (const entity of this.entities) {
      for (const hash of entity.queryHashes) {
        if (!entitiesByHash[hash]) {
          entitiesByHash[hash] = [];
        }

        entitiesByHash[hash].push(entity);
      }
    }

    for (const [hash, entities] of Object.entries(entitiesByHash)) {
      invalidateQueryByHash(hash, cache, () => {
        for (const entity of entities) {
          entity._removeQueryHashes([hash]);
        }
      });
    }
  }
}
