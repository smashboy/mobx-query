/* eslint-disable react-hooks/rules-of-hooks */
import { useMutation, type QueryClient } from "@tanstack/react-query";
import { action, observable } from "mobx";
import { ViewModel } from "mobx-utils";

export type EntityConstructor<T = unknown> = typeof Entity<T>;
export type EntityState = "pending" | "confirmed" | "failed";
export type EntityId = string | number;

export type GetEntityIdCallback<T = unknown> = (entity: T) => EntityId;
export type EntityHydrationCallback<T = unknown, S = unknown> = (
  entity: T
) => S;

export type EntityHydratedInternal<T = unknown, S = unknown> = S & Entity<T>;
export type EntityHydrated<T = unknown, S = unknown> = Omit<
  S & Entity<T>,
  | "_newEntity"
  | "queryHashes"
  | "_removeQueryHash"
  | "model"
  | "localComputedValues"
  | "localValues"
>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityHydratedAny = EntityHydrated<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityHydratedInternalAny = EntityHydratedInternal<any, any>;

export interface EntityEvents {
  onAllQueryHashesRemoved: (entityId: string) => void;
}

export class Entity<T = unknown> extends ViewModel<T> {
  entityId: string;
  @observable accessor state: EntityState = "confirmed";

  private readonly queryClient: QueryClient;
  private readonly collectionName: string;
  private readonly events: EntityEvents;
  readonly queryHashes = new Set<string>();

  constructor(
    entityId: string,
    entity: T,
    collectionName: string,
    queryClient: QueryClient,
    queryHashes: string[],
    events: EntityEvents
  ) {
    super(entity);
    this.entityId = entityId;
    this.collectionName = collectionName;
    this.queryClient = queryClient;
    this.events = events;
    for (const hash of queryHashes) {
      this.queryHashes.add(hash);
    }
  }

  useUpdateMutation(mutationFn: (draft: this) => Promise<void>) {
    if (!mutationFn.name) {
      throw new Error("Bad Mutation Callback");
    }

    const mutation = useMutation({
      mutationFn: async () => mutationFn(this),
      onMutate: () => this.onMutationMutate(),
      onSuccess: () => this.onMutationSuccess(),
      onError: () => this.onMutationError(),
    });

    const save = () => {
      if (this.isDirty) {
        mutation.mutate();
      } else {
        console.warn(
          "Entity values has not been changed, mutation is skipped."
        );
      }
    };

    return save;
  }

  @action private onMutationMutate() {
    this.queryClient.cancelQueries({ queryKey: [this.collectionName] });
    this.state = "pending";
  }

  @action private onMutationSuccess() {
    this.invalidateEntityRelatedQueries();
    this.state = "confirmed";
  }

  @action private onMutationError() {
    this.state = "failed";
    this.reset();
  }

  _newEntity(data: T, queryHashes: string[]) {
    for (const hash of this.queryHashes) {
      queryHashes.push(hash);
    }

    return new Entity(
      this.entityId,
      data,
      this.collectionName,
      this.queryClient,
      queryHashes,
      this.events
    );
  }

  _removeQueryHash(hash: string) {
    this.queryHashes.delete(hash);

    if (this.queryHashes.size === 0) {
      this.events.onAllQueryHashesRemoved(this.entityId);
    }
  }

  private invalidateEntityRelatedQueries() {
    const cache = this.queryClient.getQueryCache();

    for (const hash of this.queryHashes) {
      const query = cache.get(hash);
      if (query) {
        query.invalidate();
        if (query.isActive()) {
          query.fetch();
        }
      } else {
        this._removeQueryHash(hash);
      }
    }
  }
}
