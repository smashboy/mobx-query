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
  toJS,
  isObservableArray,
  isObservableMap,
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

    // Store the initial value (deep cloned for complex data structures)
    if (!this.initValuesSnapshot.has(change.name)) {
      // Deep clone complex data structures (objects, arrays, nested observables)
      // toJS converts observables to plain JS, effectively creating a deep clone
      this.initValuesSnapshot.set(
        change.name,
        this.deepCloneValue(change.oldValue)
      );
    }

    if (change.name !== "_isDirty" && this._isDirty === false) {
      this._isDirty = true;
    }
  }

  /**
   * Deep clones a value to ensure we store a snapshot, not a reference.
   * Handles primitives, objects, arrays, and MobX observables.
   */
  private deepCloneValue(value: unknown): unknown {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives (string, number, boolean, symbol, bigint)
    const valueType = typeof value;
    if (
      valueType === "string" ||
      valueType === "number" ||
      valueType === "boolean" ||
      valueType === "symbol" ||
      valueType === "bigint"
    ) {
      return value;
    }

    // Handle functions - store as-is (though they shouldn't typically be observable)
    if (valueType === "function") {
      return value;
    }

    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (value instanceof RegExp) {
      return new RegExp(value);
    }

    if (value instanceof Set) {
      return new Set(
        Array.from(value).map((item) => this.deepCloneValue(item))
      );
    }

    if (value instanceof Map) {
      const clonedMap = new Map();
      for (const [key, val] of value.entries()) {
        clonedMap.set(this.deepCloneValue(key), this.deepCloneValue(val));
      }
      return clonedMap;
    }

    // For objects and arrays (including MobX observables), use toJS to convert
    // observables to plain JS and create a deep clone
    try {
      return toJS(value);
    } catch (error) {
      // Fallback: if toJS fails (e.g., circular reference), return as-is
      // This is a safety measure, though it may not fully solve the problem
      console.warn(
        `Failed to deep clone value for property, using reference:`,
        error
      );
      return value;
    }
  }

  @action reset() {
    for (const [key, value] of this.initValuesSnapshot.entries()) {
      // Deep clone the stored value before restoring to ensure we're not
      // assigning a reference that might have been mutated
      const clonedValue = this.deepCloneValue(value);

      // @ts-expect-error: unknown field
      const currentValue = this[key];

      // Handle observable arrays and maps specially, similar to createViewModel
      // This ensures proper restoration of MobX observable collections
      if (isObservableArray(currentValue)) {
        // For observable arrays, use replace() to restore the original array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentValue.replace(clonedValue as any);
      } else if (isObservableMap(currentValue)) {
        // For observable maps, clear and merge to restore the original map
        currentValue.clear();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentValue.merge(clonedValue as any);
      } else {
        // For other types, assign directly
        // @ts-expect-error: unknown field
        this[key] = clonedValue;
      }
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
