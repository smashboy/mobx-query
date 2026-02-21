import type {
  DefaultError,
  MutationFunctionContext,
} from "@tanstack/react-query";
import type {
  BatchMutationInputInternal,
  UseBatchMutationHookOptions,
} from "./types";
import { MutationBase } from "./MutationBase";
import type { EntityConstructorAny } from "../entity/Entity";
import type { EntityCollection } from "../entity/EntityCollection";

export class BatchMutationBase<
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
> extends MutationBase<TEntityConstructor> {
  protected readonly collection: EntityCollection<TEntityConstructor>;

  constructor(
    mutationPrefix: string,
    protected readonly options: UseBatchMutationHookOptions<
      TEntityConstructor,
      TError,
      TMutateResult
    >,
  ) {
    super(mutationPrefix, options.entity);

    this.collection = this.getEntityCollection(options.entity);
  }

  protected async onMutateBase(
    input: BatchMutationInputInternal<TEntityConstructor>,
    context: MutationFunctionContext,
  ): Promise<TMutateResult> {
    input.strategy.onMutate();
    const result = await this.options.onMutate?.(input.entities, context);
    return result ?? ({} as TMutateResult);
  }

  protected async onSuccessBase(
    input: BatchMutationInputInternal<TEntityConstructor>,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ): Promise<void> {
    input.strategy.onSuccess();
    await this.options.onSuccess?.(input.entities, context, onMutateResult);
  }

  protected async onErrorBase(
    error: TError,
    input: BatchMutationInputInternal<TEntityConstructor>,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ): Promise<void> {
    input.strategy.onError();
    await this.options.onError?.(
      error,
      input.entities,
      context,
      onMutateResult,
    );
  }

  protected async onSettledBase(
    error: TError | null,
    input: BatchMutationInputInternal<TEntityConstructor>,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ): Promise<void> {
    await this.options.onSettled?.(
      input.entities,
      context,
      onMutateResult,
      error,
    );
  }

  protected createInternalInput(
    entities: InstanceType<TEntityConstructor>[],
  ): BatchMutationInputInternal<TEntityConstructor> {
    const dirtyEntities: InstanceType<TEntityConstructor>[] = [];

    for (const entity of entities) {
      if (!entity.isDirty) {
        console.warn(
          "Entity values has not been changed, mutation is skipped.",
        );

        continue;
      }

      dirtyEntities.push(entity);
    }

    return {
      entities: dirtyEntities,
      strategy: this.createMutationStrategy(dirtyEntities, {
        invalidationStrategy: this.options.invalidationStrategy,
        errorStrategy: this.options.errorStrategy,
        invalidateOnError: this.options.invalidateOnError,
      }),
    };
  }
}
