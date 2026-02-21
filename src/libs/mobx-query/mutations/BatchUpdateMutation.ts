import { type DefaultError, useMutation } from "@tanstack/react-query";
import type { EntityConstructorAny } from "../entity";
import { BatchMutationBase } from "./BatchMutationBase";
import type {
  BatchMutationInputInternal,
  UseBatchMutationHookOptions,
} from "./types";

export class BatchUpdateMutation<
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
> extends BatchMutationBase<TEntityConstructor, TError, TMutateResult> {
  static readonly mutationPrefix = "__mutation__batch__update__";

  constructor(
    options: UseBatchMutationHookOptions<
      TEntityConstructor,
      TError,
      TMutateResult
    >,
  ) {
    super(BatchUpdateMutation.mutationPrefix, options);
  }

  useMutation() {
    const mutation = useMutation<
      void,
      TError,
      BatchMutationInputInternal<TEntityConstructor>,
      TMutateResult
    >({
      mutationFn: (input) =>
        this.options.mutationFn(input.entities, this.context),
      onMutate: (input, context) => this.onMutateBase(input, context),
      onSuccess: (_, input, onMutateResult, context) =>
        this.onSuccessBase(input, onMutateResult, context),
      onError: (error, input, onMutateResult, context) =>
        this.onErrorBase(error, input, onMutateResult, context),
      onSettled: (_, error, input, onMutateResult, context) =>
        this.onSettledBase(error, input, onMutateResult, context),
    });

    return (entities: InstanceType<TEntityConstructor>[]) => {
      mutation.mutate(this.createInternalInput(entities));
    };
  }
}
