import type { EntityAny, EntityDataAny } from "../entity";

export type InferEntity<T> = T extends { new (...args: any[]): infer E }
  ? E extends EntityAny
    ? E
    : never
  : T extends EntityAny
    ? T
    : never;

export type InferEntityData<T> =
  InferEntity<T> extends {
    hydrate(data: infer TData): void;
  }
    ? TData
    : T extends EntityDataAny
      ? T
      : never;
