import { type DefaultError, useMutation } from "@tanstack/react-query";
import type { UseEntityMutationHookOptions } from "./types";
import { EntityMutationBase } from "./EntityMutationBase";
import type { EntityConstructorAny } from "../entity/Entity";

export class UpdateMutation<
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
> extends EntityMutationBase<void, TEntityConstructor, TError, TMutateResult> {
  static readonly mutationPrefix = "__mutation__update__";

  constructor(
    options: UseEntityMutationHookOptions<
      TEntityConstructor,
      TError,
      TMutateResult
    >,
  ) {
    super(UpdateMutation.mutationPrefix, options);
  }

  useMutation() {
    const mutation = useMutation({
      mutationFn: () => this.options.mutationFn(void 0, this.context),
      onMutate: async (_, context) => this.onMutateBase(context),
      onSuccess: (_, __, result, context) =>
        this.onSuccessBase(result, context),
      onError: (error, _, result, context) =>
        this.onErrorBase(error, result, context),
      onSettled: (_, error, __, result, context) =>
        this.onSettledBase(error, result, context),
      gcTime: this.options.gcTime,
      meta: this.options.meta,
      networkMode: this.options.networkMode,
      retry: this.options.retry,
      retryDelay: this.options.retryDelay,
      scope: this.options.scope,
      throwOnError: this.options.throwOnError,
      mutationKey: this.entityMutationKey,
    });

    return () => {
      if (!this.options.instance.isDirty) {
        return console.warn(
          "Entity values has not been changed, mutation is skipped.",
        );
      }

      // if (this.entity.state === EntityState.PENDING) {
      //   return console.warn(
      //     'Entity update mutation is already in progress, new mutation is skipped.',
      //   )
      // }

      mutation.mutate();
    };
  }

  mutate(input: void): void {
    if (!this.options.instance.isDirty) {
      return console.warn(
        "Entity values has not been changed, mutation is skipped.",
      );
    }

    this.mutateBase(input, {
      onMutate: (_, context) => this.onMutateBase(context),
      onSuccess: (_, result, context) => this.onSuccessBase(result, context),
      onError: (error, _, result, context) =>
        this.onErrorBase(error, result, context),
      onSettled: (_, error, result, context) =>
        this.onSettledBase(error, result, context),
    });
  }
}
