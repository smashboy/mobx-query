import {
  type DefaultError,
  type MutationFunctionContext,
  useMutation,
} from "@tanstack/react-query";
import type { EntityConstructorAny } from "../entity";
import type { UseEntityMutationHookOptions } from "./types";
import { EntityMutationBase } from "./EntityMutationBase";
import { action } from "mobx";

export class DeleteMutation<
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
> extends EntityMutationBase<void, TEntityConstructor, TError, TMutateResult> {
  static readonly mutationPrefix = "__mutation__delete__";

  constructor(
    options: UseEntityMutationHookOptions<
      TEntityConstructor,
      TError,
      TMutateResult
    >,
  ) {
    super(DeleteMutation.mutationPrefix, options);
  }

  useMutation() {
    const mutation = useMutation({
      mutationFn: () => this.options.mutationFn(void 0, this.context),
      onMutate: (_, context) => this.onMutate(context),
      onSuccess: (_, __, result, context) => this.onSuccess(result, context),
      onError: (error, _, result, context) =>
        this.onError(error, result, context),
      onSettled: (_, error, __, result, context) =>
        this.onSettled(error, result, context),
      gcTime: this.options.gcTime,
      meta: this.options.meta,
      networkMode: this.options.networkMode,
      retry: this.options.retry,
      retryDelay: this.options.retryDelay,
      scope: this.options.scope,
      throwOnError: this.options.throwOnError,
      mutationKey: this.entityMutationKey,
    });

    return () => mutation.mutate();
  }

  @action private async onMutate(
    context: MutationFunctionContext,
  ): Promise<TMutateResult | undefined> {
    const result = await this.onMutateBase(context);
    this.collection.deletedRecordIds.add(this.options.instance.id);
    return result;
  }

  @action private async onSuccess(
    result: TMutateResult | undefined,
    ctx: MutationFunctionContext,
  ) {
    await this.onSuccessBase(result, ctx);
    this.collection.deletedRecordIds.delete(this.options.instance.id);
    this.collection.deleteEntity(this.options.instance.id);
  }

  @action private async onError(
    error: TError,
    result: TMutateResult | undefined,
    ctx: MutationFunctionContext,
  ) {
    await this.onErrorBase(error, result, ctx);
    this.collection.deletedRecordIds.delete(this.options.instance.id);
  }

  private async onSettled(
    error: TError | null,
    result: TMutateResult | undefined,
    ctx: MutationFunctionContext,
  ) {
    await this.onSettledBase(error, result, ctx);
  }

  mutate(input: void): void {
    this.mutateBase(input, {
      onMutate: (_, context) => this.onMutate(context),
      onSuccess: (_, result, context) => this.onSuccess(result, context),
      onError: (error, _, result, context) =>
        this.onError(error, result, context),
      onSettled: (_, error, result, context) =>
        this.onSettled(error, result, context),
    });
  }
}
