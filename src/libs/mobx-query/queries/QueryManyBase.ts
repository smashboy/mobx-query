import type { DefaultError } from "@tanstack/react-query";
import type { EntityAny, EntityConstructorAny } from "../entity/Entity";
import { EntityCollection } from "../entity/EntityCollection";
import type { EntityDataAny, EntityId } from "../entity/types";
import { invalidateQueryByHash } from "../utils/invalidateQueryByHash";
import type { InferEntityData } from "../utils/types";
import { QueryBase } from "./QueryBase";
import type { UseQueryManyOptions } from "./types";

export abstract class QueryManyBase<
  TArguments,
  TMeta = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends QueryBase<TArguments> {
  protected readonly collection: EntityCollection<TEntityConstructor>;

  constructor(
    queryPrefix: string,
    protected readonly options: UseQueryManyOptions<
      TArguments,
      TMeta,
      TEntityConstructor,
      TError
    >,
  ) {
    super([options.entity], () => [queryPrefix, ...options.queryKey()]);
    this.collection = this.getEntityCollection(options.entity);
  }

  prefetch(args: TArguments) {
    const queryFn = this.queryFnWrapper(args);
    return this.queryClient.prefetchQuery({
      queryKey: this.createQueryKey(args),
      queryFn: () => queryFn.run(),
    });
  }

  ensureData(args: TArguments) {
    const queryFn = this.queryFnWrapper(args);
    return this.queryClient.ensureQueryData({
      queryKey: queryFn.queryKey,
      queryFn: () => queryFn.run(),
    });
  }

  invalidate(args: TArguments) {
    invalidateQueryByHash(
      this.createQueryHash(args),
      this.queryClient.getQueryCache(),
    );
  }

  setQueryData(data: InferEntityData<TEntityConstructor>[], args: TArguments) {
    const queryKey = this.createQueryKey(args);
    const [_, ids] = this.setManyEntities(
      data as EntityDataAny[],
      queryKey,
      this.options.entity,
    );
    this.queryClient.setQueryData(queryKey, ids);
  }

  /**
   * Returns the current entity ID array stored in the TanStack query cache
   * for the given arguments.
   */
  getQueryIds(args: TArguments): EntityId[] {
    return (
      this.queryClient.getQueryData<EntityId[]>(this.createQueryKey(args)) ?? []
    );
  }

  /**
   * Directly sets the entity ID array in the TanStack query cache
   * for the given arguments. Used by relation mutations for optimistic updates.
   */
  setQueryIds(ids: EntityId[], args: TArguments) {
    this.queryClient.setQueryData(this.createQueryKey(args), ids);
  }

  /**
   * Public accessor for the query key. Used by relation mutations
   * to construct invalidation targets.
   */
  getQueryKey(args: TArguments) {
    return this.createQueryKey(args);
  }

  protected getEntities(ids: EntityId[]) {
    const list: EntityAny[] = [];

    for (const id of ids) {
      if (this.collection.deletedRecordIds.has(id)) {
        continue;
      }

      const entity = this.collection.collection.get(id);

      if (entity) {
        list.push(entity);
      }
    }

    return list as unknown as InstanceType<TEntityConstructor>[];
  }

  protected queryFnWrapper(args: TArguments) {
    const queryKey = this.createQueryKey(args);
    return {
      run: async () => {
        if (!this.options.queryFn) {
          throw new Error("Query function is not defined");
        }

        const data = (await this.options.queryFn(
          args,
          this.context,
        )) as EntityDataAny[];

        const [_, ids] = this.setManyEntities(
          data,
          queryKey,
          this.options.entity,
        );

        return ids;
      },
      queryKey,
    };
  }
}
