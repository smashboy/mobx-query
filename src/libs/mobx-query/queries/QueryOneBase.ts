import type { EntityConstructorAny } from "../entity/Entity";
import { QueryBase } from "./QueryBase";
import type { UseQueryOneOptions } from "./types";
import { EntityCollection } from "../entity/EntityCollection";
import type { EntityDataAny, EntityId } from "../entity/types";
import { invalidateQueryByHash } from "../utils/invalidateQueryByHash";
import type { InferEntityData } from "../utils/types";
import type { DefaultError } from "@tanstack/react-query";

export class QueryOneBase<
  TArguments,
  TMeta = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends QueryBase<TArguments> {
  protected readonly collection: EntityCollection<TEntityConstructor>;

  constructor(
    queryPrefix: string,
    protected readonly options: UseQueryOneOptions<
      TArguments,
      TMeta,
      TEntityConstructor,
      TError
    >,
  ) {
    super([options.entity], () => {
      return [queryPrefix, ...options.queryKey()];
    });
    this.collection = this.getEntityCollection(options.entity);
  }

  prefetch(args: TArguments) {
    const queryFn = this.queryFnWrapper(args);
    return this.queryClient.prefetchQuery({
      queryKey: queryFn.queryKey,
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

  setQueryData(data: InferEntityData<TEntityConstructor>, args: TArguments) {
    const queryKey = this.createQueryKey(args);
    // @ts-expect-error: data is not an entity
    const entity = this.setOneEntity(data, queryKey, this.options.entity);
    this.queryClient.setQueryData(queryKey, entity.id);
  }

  protected getEntity(id: EntityId) {
    if (this.collection.deletedRecordIds.has(id)) {
      return null;
    }

    const entity = this.collection.collection.get(id);

    return entity as unknown as InstanceType<TEntityConstructor>;
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
        )) as EntityDataAny;
        const entity = this.setOneEntity(data, queryKey, this.options.entity);
        return entity.id as EntityId;
      },
      queryKey,
    };
  }
}
