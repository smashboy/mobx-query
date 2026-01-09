/* eslint-disable react-hooks/rules-of-hooks */
import {
  useMutation,
  type DefaultError,
  type QueryClient,
} from "@tanstack/react-query";
import {
  action,
  computed,
  observable,
  observe,
  type IObjectDidChange,
} from "mobx";
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

  private readonly initValuesSnapshot: Map<string | number | symbol, unknown> =
    new Map();

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

    observe(this, (change) => this.onObservableChange(change));
  }

  @computed get isDirty() {
    return this._isDirty;
  }

  @action private onObservableChange(change: IObjectDidChange) {
    if (change.type !== "update") {
      return;
    }

    // // @ts-expect-error: unkown field
    // const destination = this[change.name];

    // if (!destination) {
    //   return;
    // }

    if (!this.initValuesSnapshot.has(change.name)) {
      // console.log(change.name, destination, isComputed(destination));
      this.initValuesSnapshot.set(change.name, change.oldValue);
    }

    if (change.name !== "_isDirty" && this._isDirty === false) {
      this._isDirty = true;
    }
  }

  @action reset() {
    for (const [key, value] of this.initValuesSnapshot.entries()) {
      // @ts-expect-error: unkown field
      this[key] = value;
    }

    this._isDirty = false;
    this.initValuesSnapshot.clear();
  }

  protected useUpdateMutation<TError = DefaultError, TContext = unknown>(
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
      if (!this.isDirty) {
        return console.warn(
          "Entity values has not been changed, mutation is skipped."
        );
      }

      if (this.state === "pending") {
        return console.warn(
          "Entity update mutation is already in progress, new mutation is skipped."
        );
      }

      mutation.mutate();
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
