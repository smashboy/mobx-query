import { __MOBX_QUERY__ } from "./MQClient";
import type {
  DefaultError,
  MutationOptions,
  QueryClient,
} from "@tanstack/react-query";
import type { MQClientContextRegistered } from "./types";
import type { EntityCollection } from "../entity/EntityCollection";
import type { EntityConstructorAny } from "../entity/Entity";
import type { MutationFn } from "../mutations/types";

export abstract class MQClientAccessor {
  protected readonly queryClient: QueryClient;
  protected readonly context: MQClientContextRegistered;
  private readonly globalState: Map<string, EntityCollection>;

  constructor() {
    if (!__MOBX_QUERY__) {
      throw new Error("Client not found");
    }

    if (!__MOBX_QUERY__.context) {
      throw new Error("MQClientContext is required");
    }

    this.queryClient = __MOBX_QUERY__.context.queryClient;
    this.globalState = __MOBX_QUERY__.state;
    this.context = __MOBX_QUERY__.context;
  }

  protected getEntityCollection<
    TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  >(
    entityConstructor: TEntityConstructor,
  ): EntityCollection<TEntityConstructor> {
    const collection = this.globalState.get(entityConstructor.name);

    if (!collection) {
      throw new Error(
        `Entity collection not found for entity ${entityConstructor.name}`,
      );
    }

    return collection as unknown as EntityCollection<TEntityConstructor>;
  }

  protected runSyncMutation<
    TInput,
    TError = DefaultError,
    TMutateResult = unknown,
  >(
    input: TInput,
    mutationFn: MutationFn<TInput>,
    options?: MutationOptions<void, TError, TInput, TMutateResult>,
  ) {
    this.queryClient
      .getMutationCache()
      .build<void, TError, TInput, TMutateResult>(this.queryClient, {
        mutationFn: (input) => mutationFn(input, this.context),
        onError: options?.onError,
        onMutate: options?.onMutate,
        onSuccess: options?.onSuccess,
        onSettled: options?.onSettled,
        gcTime: options?.gcTime,
        meta: options?.meta,
        networkMode: options?.networkMode,
        retry: options?.retry,
        retryDelay: options?.retryDelay,
        scope: options?.scope,
        mutationKey: options?.mutationKey,
      })
      .execute(input)
      .catch((error) => console.log("runSyncMutation error", error));
  }
}
