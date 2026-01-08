/* eslint-disable react-hooks/rules-of-hooks */
import {
  useMutation,
  type DefaultError,
  type QueryClient,
} from "@tanstack/react-query";
import { action, computed, observable, observe } from "mobx";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import type {
  EntityState,
  OptimisticMutationStrategyOptions,
  UseUpdateMutationHookOptions,
} from "./types";

export type EntityConstructor = typeof Entity;

export type EntityHydratedInternal<THydrated> = THydrated & Entity;
export type EntityHydrated<T = unknown> = Omit<
  EntityHydratedInternal<T>,
  | "_newEntity"
  | "queryHashes"
  | "_removeQueryHash"
  | "model"
  | "localComputedValues"
  | "localValues"
  | "submit"
  | "reset"
  | "resetProperty"
  | "changedValues"
>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityHydratedAny = EntityHydrated<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityHydratedInternalAny = EntityHydratedInternal<any>;

export interface EntityEvents {
  onAllQueryHashesRemoved: (entityId: string) => void;
}

export class Entity {
  entityId!: string;
  queryHashes = new Set<string>();

  private queryClient!: QueryClient;
  private collectionName!: string;
  private events!: EntityEvents;
  private collectionOptimisticMutationStrategyOptions?: OptimisticMutationStrategyOptions;

  @observable accessor state: EntityState = "confirmed";
  @observable private accessor _isDirty = false;

  _init(
    entityId: string,
    collectionName: string,
    queryClient: QueryClient,
    queryHashes: string[],
    events: EntityEvents,
    collectionOptimisticMutationStrategyOptions?: OptimisticMutationStrategyOptions
  ) {
    this.entityId = entityId;
    this.collectionName = collectionName;
    this.queryClient = queryClient;
    this.events = events;
    this.collectionOptimisticMutationStrategyOptions =
      collectionOptimisticMutationStrategyOptions;
    for (const hash of queryHashes) {
      this.queryHashes.add(hash);
    }

    observe(this, (change) => {
      if (
        change.type === "update" &&
        change.name !== "_isDirty" &&
        this._isDirty === false
      ) {
        this._isDirty = true;
      }
    });
  }

  @computed get isDirty() {
    return this._isDirty;
  }

  @action reset() {}

  useUpdateMutation<TError = DefaultError, TContext = unknown>(
    mutationFn: (draft: this) => Promise<void>,
    options?: UseUpdateMutationHookOptions<TError, TContext>
  ) {
    if (!mutationFn.name) {
      throw new Error("Bad Mutation Callback");
    }

    const mutationStrategy = new OptimisticMutationStrategy(
      this,
      this.queryClient,
      this.collectionName,
      this.collectionOptimisticMutationStrategyOptions,
      {
        invalidationStrategy: options?.invalidationStrategy,
        onMutationErrorStrategy: options?.onMutationErrorStrategy,
      }
    );

    const mutation = useMutation({
      mutationFn: () => mutationFn(this),
      onMutate: () => {
        mutationStrategy.onMutate();
        options?.onMutate?.();
      },
      onSuccess: () => {
        mutationStrategy.onSuccess();
        options?.onSuccess?.();
      },
      onError: () => {
        mutationStrategy.onError();
        options?.onError?.();
      },
      onSettled: () => options?.onSettled?.(),
      gcTime: options?.gcTime,
      meta: options?.meta,
      networkMode: options?.networkMode,
      retry: options?.retry,
      retryDelay: options?.retryDelay,
      scope: options?.scope,
      throwOnError: options?.throwOnError,
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

  _removeQueryHash(hash: string) {
    this.queryHashes.delete(hash);

    if (this.queryHashes.size === 0) {
      this.events.onAllQueryHashesRemoved(this.entityId);
    }
  }
}
