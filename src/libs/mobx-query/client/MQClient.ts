import type { EntityConstructorAny } from "../entity/Entity";
import { EntityCollection } from "../entity/EntityCollection";
import {
  OptimisticMutationErrorStrategy,
  OptimisticMutationInvalidationStrategy,
} from "../mutations/constants";
import type { MQClientContextRegistered } from "./types";
export interface MQClientOptions {
  invalidationStrategy?: OptimisticMutationInvalidationStrategy;
  errorStrategy?: OptimisticMutationErrorStrategy;
  invalidateOnError?: boolean;
}

export interface MQClientProps<T> extends MQClientOptions {
  context: MQClientContextRegistered;
  entities: EntityConstructorAny[];
  rootStore: () => T;
}

export const __MOBX_QUERY__: {
  state: Map<string, EntityCollection>;
  context: MQClientContextRegistered | null;
  options: Required<MQClientOptions>;
} = {
  state: new Map(),
  context: null,
  options: {
    invalidationStrategy:
      OptimisticMutationInvalidationStrategy.REFERENCED_QUERIES,
    errorStrategy: OptimisticMutationErrorStrategy.ROLLBACK,
    invalidateOnError: true,
  },
};

export class MQClient<T> {
  readonly rootStore: T;

  constructor(props: MQClientProps<T>) {
    __MOBX_QUERY__.context = props.context;

    for (const entity of props.entities) {
      __MOBX_QUERY__.state.set(
        entity.name,
        new EntityCollection(entity, props.context.queryClient),
      );
    }

    // if (process.env.NODE_ENV === 'development') {
    //   setupMobxDevtoolsV2()
    // }

    __MOBX_QUERY__.options.invalidationStrategy =
      props.invalidationStrategy ??
      OptimisticMutationInvalidationStrategy.REFERENCED_QUERIES;
    __MOBX_QUERY__.options.errorStrategy =
      props.errorStrategy ?? OptimisticMutationErrorStrategy.ROLLBACK;
    __MOBX_QUERY__.options.invalidateOnError = props.invalidateOnError ?? true;

    this.rootStore = props.rootStore();
  }

  getEntityCollection<TEntityConstructor extends EntityConstructorAny>(
    entity: TEntityConstructor,
  ) {
    const collection = __MOBX_QUERY__.state.get(
      entity.name,
    ) as EntityCollection<TEntityConstructor>;

    if (!collection) {
      throw new Error(`Entity collection not found for entity ${entity.name}`);
    }

    return collection;
  }
}
