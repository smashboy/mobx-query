/* eslint-disable react-hooks/rules-of-hooks */
import { useMutation, type QueryClient } from "@tanstack/react-query";
import { action, observable } from "mobx";
import { ViewModel } from "mobx-utils";

export type EntityConstructor<T = unknown> = typeof Entity<T>;
export type EntityState = "pending" | "confirmed" | "failed";
export type EntityId = string | number;

export type GetEntityIdCallback<T = unknown> = (entity: T) => EntityId;
export type EntityHydrationCallback<T = unknown, S = unknown> = (
  entity: T
) => S;

export type EntityHydrated<T = unknown, S = unknown> = S & Entity<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityHydratedAny = EntityHydrated<any, any>;

export class Entity<T = unknown> extends ViewModel<T> {
  entityId: string;
  @observable accessor state: EntityState = "confirmed";

  private queryClient: QueryClient;
  private collectionName: string;
  readonly queryHashes = new Set<string>();

  constructor(
    entity: T,
    entityId: string,
    collectionName: string,
    queryClient: QueryClient,
    queryHashes: string[]
  ) {
    super(entity);
    this.entityId = entityId;
    this.collectionName = collectionName;
    this.queryClient = queryClient;
    for (const hash of queryHashes) {
      this.queryHashes.add(hash);
    }
  }

  useUpdateMutation(mutationFn: (draft: this) => Promise<T>) {
    if (!mutationFn.name) {
      throw new Error("Bad Mutation Callback");
    }

    const mutation = useMutation({
      mutationFn: async () => mutationFn(this),
      onMutate: () => {},
      onSuccess: () => {},
      onError: () => {},
    });

    const save = () => mutation.mutate();

    return save;
  }

  @action private onMutate() {
    this.queryClient.cancelQueries({ queryKey: [this.collectionName] });

    this.state = "pending";
  }

  @action private onSuccess() {
    // this._update(data);
  }

  @action private onError() {
    this.state = "failed";
    this.reset();
  }

  @action _update() {
    this.state = "confirmed";
  }

  _newEntity(entity: T, queryHashes: string[]) {
    for (const hash of this.queryHashes) {
      queryHashes.push(hash);
    }

    return new Entity(
      entity,
      this.entityId,
      this.collectionName,
      this.queryClient,
      queryHashes
    );
  }

  _removeQueryHash(hash: string) {
    this.queryHashes.delete(hash);

    return this.queryHashes.size === 0;
  }
}
