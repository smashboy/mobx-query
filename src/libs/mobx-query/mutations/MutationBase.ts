import type { EntityAny, EntityConstructorAny } from "../entity";
import { EntityCollection } from "../entity/EntityCollection";
import { MQClientAccessor } from "../client";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import type { OptimisticMutationStrategyOptions } from "./types";

export class MutationBase<
  TEntityConstructor extends EntityConstructorAny,
> extends MQClientAccessor {
  protected readonly collection: EntityCollection<TEntityConstructor>;

  constructor(
    protected readonly mutationPrefix: string,
    protected readonly entity: TEntityConstructor,
  ) {
    super();

    this.collection = this.getEntityCollection(entity);
  }

  get baseMutationKey() {
    return [this.entity.name, this.mutationPrefix];
  }

  protected createMutationStrategy(
    entities: EntityAny[],
    options: OptimisticMutationStrategyOptions,
  ) {
    const mutationStrategy = new OptimisticMutationStrategy(
      this.entity,
      entities,
      {
        invalidationStrategy: options.invalidationStrategy,
        errorStrategy: options.errorStrategy,
        invalidateOnError: options.invalidateOnError,
      },
    );
    return mutationStrategy;
  }
}
