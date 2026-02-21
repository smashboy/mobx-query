import type { EntityConstructorAny, EntityAny } from "../entity";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";
import type {
  EntityMutationCallbacks,
  UseEntityMutationHookOptions,
} from "./types";
import type {
  DefaultError,
  MutationFunctionContext,
} from "@tanstack/react-query";
import { MutationBase } from "./MutationBase";

/**
 * Base class for mutations that operate ON an existing entity.
 * Use this for update/delete mutations where the entity already exists.
 * For entity-creating mutations, use CollectionMutationBase instead.
 */
export abstract class EntityMutationBase<
  TInput,
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
> extends MutationBase<TEntityConstructor> {
  protected readonly mutationStrategy: OptimisticMutationStrategy;

  constructor(
    mutationPrefix: string,
    protected readonly options: UseEntityMutationHookOptions<
      TEntityConstructor,
      TError,
      TMutateResult
    >,
  ) {
    super(mutationPrefix, options.entity);
    this.mutationStrategy = this.createMutationStrategy([options.instance], {
      invalidationStrategy: options.invalidationStrategy,
      errorStrategy: options.errorStrategy,
      invalidateOnError: options.invalidateOnError,
    });
  }

  get entityMutationKey() {
    return [...this.baseMutationKey, this.options.instance.id];
  }

  protected async onMutateBase(
    context: MutationFunctionContext,
  ): Promise<TMutateResult | undefined> {
    this.mutationStrategy.onMutate();
    const result = await this.options.onMutate?.(
      this.options.instance,
      context,
    );
    return result;
  }

  protected async onSuccessBase(
    result: TMutateResult | undefined,
    ctx: MutationFunctionContext,
  ) {
    this.mutationStrategy.onSuccess();
    await this.options.onSuccess?.(this.options.instance, result, ctx);
  }

  protected async onErrorBase(
    error: TError,
    result: TMutateResult | undefined,
    ctx: MutationFunctionContext,
  ) {
    this.mutationStrategy.onError();
    await this.options.onError?.(error, this.options.instance, result, ctx);
  }

  protected async onSettledBase(
    error: TError | null,
    result: TMutateResult | undefined,
    ctx: MutationFunctionContext,
  ) {
    await this.options.onSettled?.(this.options.instance, error, result, ctx);
  }

  protected mutateBase(
    input: TInput,
    callbacks: EntityMutationCallbacks<EntityAny, TError, TMutateResult>,
  ) {
    this.runSyncMutation(
      input,
      (_, context) => this.options.mutationFn(void 0, context),
      {
        onMutate: async (_, context) =>
          callbacks.onMutate?.(this.options.instance, context),
        onSuccess: (_, __, result, context) =>
          callbacks.onSuccess?.(this.options.instance, result!, context),
        onError: (error, _, result, context) =>
          callbacks.onError?.(error, this.options.instance, result, context),
        onSettled: (_, error, __, result, context) =>
          callbacks.onSettled?.(this.options.instance, error, result, context),
        gcTime: this.options.gcTime,
        meta: this.options.meta,
        networkMode: this.options.networkMode,
        retry: this.options.retry,
        retryDelay: this.options.retryDelay,
        scope: this.options.scope,
        mutationKey: this.entityMutationKey,
      },
    );
  }

  abstract mutate(input: TInput): void;
}
