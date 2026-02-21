import type { DefaultError, NetworkMode } from "@tanstack/react-query";
import type { EntityConstructorAny } from "../entity";
import type { MQClientContextRegistered } from "../types";
import type { InferEntityData } from "../utils";

export type UseQueryManyFunction<
  TArguments,
  TEntityConstructor extends EntityConstructorAny,
> = (
  args: TArguments,
  context: MQClientContextRegistered,
) =>
  | InferEntityData<TEntityConstructor>[]
  | Promise<InferEntityData<TEntityConstructor>[]>;

export type UseQueryOneFunction<
  TArguments,
  TEntityConstructor extends EntityConstructorAny,
> = (
  args: TArguments,
  context: MQClientContextRegistered,
) =>
  | InferEntityData<TEntityConstructor>
  | Promise<InferEntityData<TEntityConstructor>>;

export interface UseQueryCommonOptions<
  TArguments,
  TMeta = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> {
  entity: TEntityConstructor;
  queryKey: () => ReadonlyArray<unknown>;
  staleTime?: number | "static";
  gcTime?: number;
  enabled?: boolean | ((meta: TMeta, args: TArguments) => boolean);
  // enabled?: boolean
  networkMode?: NetworkMode;
  retry?: boolean | number | ((failureCount: number, error: TError) => boolean);
  retryOnMount?: boolean;
  retryDelay?: number | ((failureCount: number, error: TError) => number);
}

export interface UseQueryOneOptions<
  TArguments,
  TMeta = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends UseQueryCommonOptions<TArguments, TMeta, TEntityConstructor, TError> {
  queryFn?: UseQueryOneFunction<TArguments, TEntityConstructor>;
}

export interface UseQueryManyOptions<
  TArguments,
  TMeta = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends UseQueryCommonOptions<TArguments, TMeta, TEntityConstructor, TError> {
  queryFn?: UseQueryManyFunction<TArguments, TEntityConstructor>;
}
