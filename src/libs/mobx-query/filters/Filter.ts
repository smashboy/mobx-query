import type { EntityConstructorAny } from "../entity/Entity";
import { Condition } from "./Condition";
import { SortCondition } from "./SortCondition";

export interface FilterOptions<
  T,
  TEntityConstructor extends EntityConstructorAny,
  TEntity extends InstanceType<TEntityConstructor> =
    InstanceType<TEntityConstructor>,
> {
  where?: Condition<T, keyof TEntity> | Condition<T, keyof TEntity>[];
  sort?: SortCondition<keyof TEntity> | SortCondition<keyof TEntity>[];
  limit?: number;
}

export class Filter<
  T,
  TEntityConstructor extends EntityConstructorAny,
  TEntity extends InstanceType<TEntityConstructor> =
    InstanceType<TEntityConstructor>,
> {
  constructor(
    public readonly entityConstructor: TEntityConstructor,
    public readonly options: FilterOptions<T, TEntityConstructor, TEntity> = {
      where: [],
      sort: [],
      limit: undefined,
    },
  ) {}

  apply(entities: TEntity[]): TEntity[] {
    let result = [...entities];

    if (this.options.where) {
      const conditions = Array.isArray(this.options.where)
        ? this.options.where
        : [this.options.where];
      result = result.filter((entity) =>
        conditions.every((c) => c.matches(entity)),
      );
    }

    if (this.options.sort) {
      const sorts = Array.isArray(this.options.sort)
        ? this.options.sort
        : [this.options.sort];
      result.sort((a, b) => {
        for (const s of sorts) {
          const res = s.apply(a, b);
          if (res !== 0) return res;
        }
        return 0;
      });
    }

    if (this.options.limit !== undefined) {
      result = result.slice(0, this.options.limit);
    }

    return result;
  }
}
