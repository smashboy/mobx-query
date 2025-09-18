/* eslint-disable react-hooks/rules-of-hooks */
import { useMutation, type QueryClient } from "@tanstack/react-query";
import { observable } from "mobx";
import { ViewModel } from "mobx-utils";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import type { EntityId, EntityState } from "./types";

export type EntityConstructor<T = unknown> = typeof Entity<T>;

export type GetEntityIdCallback<T = unknown> = (entity: T) => EntityId;
export type EntityHydrationCallback<T = unknown, S = unknown> = (
  entity: T
) => S;

export type EntityHydratedInternal<T> = T & Entity<T>;
export type EntityHydrated<T = unknown> = Omit<
  EntityHydratedInternal<T>,
  | "_newEntity"
  | "queryHashes"
  | "_removeQueryHash"
  | "model"
  | "localComputedValues"
  | "localValues"
>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityHydratedAny = EntityHydrated<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityHydratedInternalAny = EntityHydratedInternal<any>;

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

    const mutationStrategy = new OptimisticMutationStrategy(
      this,
      this.queryClient,
      this.collectionName
    );

    const mutation = useMutation({
      mutationFn: () => mutationFn(this),
      onMutate: () => mutationStrategy.onMutate(),
      onSuccess: () => mutationStrategy.onSuccess(),
      onError: () => mutationStrategy.onError(),
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
}
