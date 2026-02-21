import {
  type DefaultError,
  type MutationFunctionContext,
  useMutation,
} from "@tanstack/react-query";
import type {
  CreateMutationInputInternal,
  UseCreateMutationHookOptions,
} from "./types";
import { action } from "mobx";
import {
  OptimisticMutationErrorStrategy,
  OptimisticMutationInvalidationStrategy,
} from "./constants";
import { MutationBase } from "./MutationBase";
import type { EntityAny, EntityConstructorAny } from "../entity/Entity";

export class CreateMutation<
  TInput,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
> extends MutationBase<TEntityConstructor> {
  static readonly mutationPrefix = "__mutation__create__";

  constructor(
    private readonly options: UseCreateMutationHookOptions<
      TInput,
      TEntityConstructor,
      TError,
      TMutateResult
    >,
  ) {
    super(CreateMutation.mutationPrefix, options.entity);
  }

  useMutation() {
    const mutation = useMutation<
      void,
      TError,
      CreateMutationInputInternal<TInput, TEntityConstructor>,
      TMutateResult
    >({
      mutationFn: (
        input: CreateMutationInputInternal<TInput, TEntityConstructor>,
      ) => this.options.mutationFn(input.input, input.entity, this.context),
      onMutate: (input, context) => this.onMutate(input, context),
      onSuccess: (_, input, onMutateResult, context) =>
        this.onSuccess(input, onMutateResult, context),
      onError: (error, input, onMutateResult, context) =>
        this.onError(error, input, onMutateResult, context),
      onSettled: (_, error, input, onMutateResult, context) =>
        this.onSettled(input, error, onMutateResult, context),
      gcTime: this.options.gcTime,
      meta: this.options.meta,
      networkMode: this.options.networkMode,
      retry: this.options.retry,
      retryDelay: this.options.retryDelay,
      scope: this.options.scope,
      throwOnError: this.options.throwOnError,
      mutationKey: this.baseMutationKey,
    });

    return (input: TInput) => {
      const entity =
        new this.options.entity() as InstanceType<TEntityConstructor>;
      entity.hydrate(input);
      entity._markAsHydrated();

      this.collection.setEntity(entity);
      this.collection.clientOnlyEntityIds.add(entity.id);

      mutation.mutate({
        input,
        entity,
        mutationStrategy: this.createMutationStrategy([entity]),
      });
    };
  }

  @action private async onMutate(
    input: CreateMutationInputInternal<TInput, TEntityConstructor>,
    context: MutationFunctionContext,
  ): Promise<TMutateResult> {
    input.mutationStrategy.onMutate();

    const onMutateResult = await this.options.onMutate?.(
      input.input,
      input.entity,
      context,
    );
    return onMutateResult ?? ({} as TMutateResult);
  }

  @action private onSuccess(
    input: CreateMutationInputInternal<TInput, TEntityConstructor>,
    onMutateResult: TMutateResult,
    context: MutationFunctionContext,
  ) {
    input.mutationStrategy.onSuccess();

    // if (this.pendingEntity) {
    //   this.entityManager.clientOnlyEntityIds.delete(this.pendingEntity.id)
    // }
    this.options.onSuccess?.(
      input.input,
      input.entity,
      onMutateResult,
      context,
    );
  }

  @action private onError(
    error: TError,
    input: CreateMutationInputInternal<TInput, TEntityConstructor>,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) {
    const strategy =
      input.mutationStrategy?.mutationErrorStrategy ??
      OptimisticMutationErrorStrategy.ROLLBACK;
    input.mutationStrategy.onError(true);

    if (strategy === OptimisticMutationErrorStrategy.ROLLBACK) {
      this.collection.deleteEntity(input.entity.id);
    }

    this.options.onError?.(
      error,
      input.input,
      input.entity,
      onMutateResult,
      context,
    );
  }

  @action private onSettled(
    input: CreateMutationInputInternal<TInput, TEntityConstructor>,
    error: TError | null,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) {
    this.options.onSettled?.(
      input.input,
      input.entity,
      error,
      onMutateResult,
      context,
    );
  }

  protected createMutationStrategy(entities: EntityAny[]) {
    if (
      this.options.invalidationStrategy ===
      OptimisticMutationInvalidationStrategy.REFERENCED_QUERIES
    ) {
      throw new Error(
        "REFERENCED_QUERIES invalidation strategy is not supported for create mutation",
      );
    }

    const mutationStrategy = super.createMutationStrategy(entities, {
      invalidationStrategy:
        this.options.invalidationStrategy ??
        OptimisticMutationInvalidationStrategy.ALL_ENTITY_QUERIES,
      errorStrategy: this.options.errorStrategy,
      invalidateOnError: this.options.invalidateOnError,
    });

    return mutationStrategy;
  }
}
