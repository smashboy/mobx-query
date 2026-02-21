import {
  action,
  type IObjectDidChange,
  isObservableArray,
  isObservableMap,
  observable,
  observe,
  toJS,
} from "mobx";
import type { EntityData, EntityEvents, EntityId } from "./types";
import { EntityState } from "./constants";

export type EntityConstructor<
  TData = unknown,
  TEntityId extends EntityId = string,
  E extends Entity<TData, TEntityId> = Entity<TData, TEntityId>,
> = new () => E;

export type EntityConstructorAny = EntityConstructor<
  EntityData,
  any,
  EntityAny
>;

export type EntityAny = Entity<any, any>;

const IGNORE_FIELDS: PropertyKey[] = ["isDirty", "state"] as const;

export type EntityValueKeys<T> = {
  [K in keyof T]: T[K] extends Function
    ? never
    : K extends "isDirty" | "state" | "queryHashes"
      ? never
      : K;
}[keyof T] &
  string;

export abstract class Entity<
  TData = unknown,
  TEntityId extends EntityId = string,
> {
  abstract id: TEntityId;

  abstract hydrate(data: TData): void;

  readonly queryHashes = new Set<string>();

  private events!: EntityEvents<TEntityId>;

  @observable accessor state: EntityState = EntityState.CONFIRMED;
  @observable accessor isDirty = false;

  private readonly initValuesSnapshot: Map<string | number | symbol, unknown> =
    new Map();

  private isHydrated = false;

  _init(queryHashes: string[], events: EntityEvents<TEntityId>) {
    this.events = events;

    for (const hash of queryHashes) {
      this.queryHashes.add(hash);
    }

    observe(this, (change) => this.onObservableChange(change));
  }

  // @computed get isDirty() {
  //   return this._isDirty
  // }

  _removeQueryHashes(hashes: string[]) {
    for (const hash of hashes) {
      this.queryHashes.delete(hash);
    }

    if (this.queryHashes.size === 0) {
      this.events.onAllQueryHashesRemoved(this.id);
    }
  }

  _markAsHydrated() {
    this.isHydrated = true;
  }

  @action private onObservableChange(change: IObjectDidChange) {
    if (change.type !== "update") {
      return;
    }

    if (!this.isHydrated) {
      return;
    }

    if (IGNORE_FIELDS.includes(change.name as any)) {
      return;
    }

    // Store the initial value (deep cloned for complex data structures)
    if (!this.initValuesSnapshot.has(change.name)) {
      // Deep clone complex data structures (objects, arrays, nested observables)
      // toJS converts observables to plain JS, effectively creating a deep clone
      this.initValuesSnapshot.set(
        change.name,
        this.deepCloneValue(change.oldValue),
      );
    }

    if (this.isDirty === false) {
      this.isDirty = true;
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
        Array.from(value).map((item) => this.deepCloneValue(item)),
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
        error,
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

    this._clearDirty();
  }

  @action _clearDirty() {
    this.isDirty = false;
    this.initValuesSnapshot.clear();
  }

  // isDirtyField(field: EntityValueKeys<this>) {
  //   return this.initValuesSnapshot.has(field)
  // }

  // getOriginalValue<K extends EntityValueKeys<this>>(
  //   field: K,
  // ): this[K] | undefined {
  //   return this.initValuesSnapshot.get(field) as this[K] | undefined
  // }
}
