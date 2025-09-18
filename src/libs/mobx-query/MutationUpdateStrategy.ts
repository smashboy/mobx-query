export type MutationInvalidationStrategy =
  | "collection"
  | "related-queries"
  | "none";

export type MutationErrorStrategy = "rollback" | "keep";

export interface MutationUpdateStrategyOptions {
  invalidationStrategy?: MutationInvalidationStrategy;
  onMutationErrorStrategy?: MutationErrorStrategy;
}

export type MutationErrorStrategyCallbacks<T> = Record<
  MutationErrorStrategy,
  (entity: T) => void
>;

export class MutationUpdateStrategy<T> {
  private readonly collectionOptions: Required<MutationUpdateStrategyOptions>;
  private readonly mutationOptions?: MutationUpdateStrategyOptions;

  private readonly invalidationCallbacks: Record<
    Exclude<MutationInvalidationStrategy, "none">,
    () => void
  >;
  private readonly onErrorCallbacks: MutationErrorStrategyCallbacks<T>;

  constructor(
    invalidationCallbacks: Record<
      Exclude<MutationInvalidationStrategy, "none">,
      () => void
    >,
    onErrorCallbacks: MutationErrorStrategyCallbacks<T>,
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

  onError(entity: T) {
    const strategy = this.getMutationErrorStrategy();
    switch (strategy) {
      case "rollback":
        this.onErrorCallbacks.rollback(entity);
        break;
      case "keep":
        this.onErrorCallbacks.keep(entity);
        break;
      default:
        break;
    }
  }
}
