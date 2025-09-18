export type MutationInvalidationStrategy =
  | "collection"
  | "related-queries"
  | "none";

export type MutationErrorStrategy = "rollback" | "keep";

export interface MutationUpdateStrategyOptions {
  invalidationStrategy?: MutationInvalidationStrategy;
  onMutationErrorStrategy?: MutationErrorStrategy;
}

export type MutationErrorStrategyCallbacks = Record<
  MutationErrorStrategy,
  () => void
>;

export class MutationUpdateStrategy {
  private readonly collectionOptions: Required<MutationUpdateStrategyOptions>;
  private readonly mutationOptions?: MutationUpdateStrategyOptions;

  private readonly invalidationCallbacks: Record<
    Exclude<MutationInvalidationStrategy, "none">,
    () => void
  >;
  private readonly onErrorCallbacks: MutationErrorStrategyCallbacks;

  constructor(
    invalidationCallbacks: Record<
      Exclude<MutationInvalidationStrategy, "none">,
      () => void
    >,
    onErrorCallbacks: MutationErrorStrategyCallbacks,
    collectionOptions?: MutationUpdateStrategyOptions,
    mutationOptions?: MutationUpdateStrategyOptions
  ) {
    this.invalidationCallbacks = invalidationCallbacks;
    this.onErrorCallbacks = onErrorCallbacks;

    this.collectionOptions = {
      invalidationStrategy:
        collectionOptions?.invalidationStrategy ?? "related-queries",
      onMutationErrorStrategy:
        collectionOptions?.onMutationErrorStrategy ?? "rollback",
    };
    this.mutationOptions = mutationOptions;
  }

  getInvalidationStrategy() {
    return (
      this.mutationOptions?.invalidationStrategy ??
      this.collectionOptions.invalidationStrategy
    );
  }

  getMutationErrorStrategy() {
    return (
      this.mutationOptions?.onMutationErrorStrategy ??
      this.collectionOptions.onMutationErrorStrategy
    );
  }

  onInvalidate() {
    const strategy = this.getInvalidationStrategy();
    switch (strategy) {
      case "collection":
        this.invalidationCallbacks.collection();
        break;
      case "related-queries":
        this.invalidationCallbacks["related-queries"]();
        break;
      default:
        break;
    }
  }

  onError() {
    const strategy = this.getMutationErrorStrategy();
    switch (strategy) {
      case "rollback":
        this.onErrorCallbacks.rollback();
        break;
      case "keep":
        this.onErrorCallbacks.keep();
        break;
      default:
        break;
    }
  }
}
