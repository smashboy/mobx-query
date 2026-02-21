import { hashKey, useIsFetching } from "@tanstack/react-query";
import { MQClientAccessor } from "../MQClientAccessor";
import type { EntityConstructorAny } from "../entity/Entity";
import type { EntityDataAny } from "../entity/types";

export abstract class QueryBase<TArguments = unknown> extends MQClientAccessor {
  constructor(
    private readonly entityConstructors: EntityConstructorAny[],
    private readonly baseQueryKeysRest: () => unknown[],
  ) {
    super();
  }

  get baseQueryKey() {
    return [
      this.entityConstructors.map((e) => e.name).join("_"),
      ...this.baseQueryKeysRest(),
    ];
  }

  get baseQueryHash() {
    return hashKey(this.baseQueryKey);
  }

  protected createQueryKey(args: TArguments) {
    return [...this.baseQueryKey, args];
  }

  protected createQueryHash(args: TArguments) {
    return hashKey(this.createQueryKey(args));
  }

  useIsFetching(args: TArguments) {
    return useIsFetching({
      queryKey: this.createQueryKey(args),
    });
  }

  protected setOneEntity(
    data: EntityDataAny,
    queryKey: unknown[],
    entityConstructor: EntityConstructorAny,
  ) {
    const collection = this.getEntityCollection(entityConstructor);
    const entity = collection.setEntity(data, [hashKey(queryKey)]);

    return entity;
  }

  protected setManyEntities(
    data: EntityDataAny[],
    queryKey: unknown[],
    entityConstructor: EntityConstructorAny,
  ) {
    if (typeof data !== "object" || !Array.isArray(data)) {
      throw new Error(
        `Query function for ${entityConstructor.name} must return an array of entities`,
      );
    }

    const collection = this.getEntityCollection(entityConstructor);
    const entities = collection.setEntities(data, [hashKey(queryKey)]);

    return entities;
  }
}
