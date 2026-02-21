import type {
  DefaultError,
  MutationFunctionContext,
  UseMutationOptions,
} from "@tanstack/react-query";
import type { MQClientContextRegistered } from "../types";
import type { EntityAny, EntityConstructorAny } from "../entity/Entity";
import * as MutationConstants from "./constants";
import { OptimisticMutationStrategy } from "./OptimisticMutationStrategy";

export type OptimisticMutationInvalidationStrategy =
  (typeof MutationConstants.OptimisticMutationInvalidationStrategy)[keyof typeof MutationConstants.OptimisticMutationInvalidationStrategy];
export type OptimisticMutationErrorStrategy =
  (typeof MutationConstants.OptimisticMutationErrorStrategy)[keyof typeof MutationConstants.OptimisticMutationErrorStrategy];

export type MutationFn<TInput> = (
  input: TInput,
  context: MQClientContextRegistered,
) => Promise<void>;

export type BatchMutationFn<TEntity extends EntityAny> = (
  entities: TEntity[],
  context: MQClientContextRegistered,
) => Promise<void>;

export interface CreateMutationInputInternal<
  TInput,
  TEntityConstructor extends EntityConstructorAny,
> {
  input: TInput;
  entity: InstanceType<TEntityConstructor>;
  mutationStrategy: OptimisticMutationStrategy;
}

export interface BatchMutationInputInternal<
  TEntityConstructor extends EntityConstructorAny,
> {
  strategy: OptimisticMutationStrategy;
  entities: InstanceType<TEntityConstructor>[];
}

export interface OptimisticMutationStrategyOptions {
  invalidationStrategy?: OptimisticMutationInvalidationStrategy;
  errorStrategy?: OptimisticMutationErrorStrategy;
  invalidateOnError?: boolean;
}

export interface UseMutationHookCommonOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TMutateResult = unknown,
> extends Omit<
  UseMutationOptions<TData, TError, TVariables, TMutateResult>,
  | "mutationFn"
  | "mutationKey"
  | "onSuccess"
  | "onError"
  | "onMutate"
  | "onSettled"
> {
  // mutationKey?: () => ReadonlyArray<unknown>
}

export interface UseCreateMutationHookOptions<
  TInput,
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
  TEntity extends InstanceType<TEntityConstructor> =
    InstanceType<TEntityConstructor>,
>
  extends
    UseMutationHookCommonOptions<void, TError, void, TMutateResult>,
    OptimisticMutationStrategyOptions,
    CreateEntityMutationCallbacks<TInput, TEntity, TError, TMutateResult> {
  entity: TEntityConstructor;
  mutationFn: CreateMutationFn<TInput, TEntityConstructor>;
}

export type CreateMutationFn<
  TInput,
  TEntityConstructor extends EntityConstructorAny,
> = (
  input: TInput,
  entity: InstanceType<TEntityConstructor>,
  context: MQClientContextRegistered,
) => Promise<void>;

export interface CreateEntityMutationCallbacks<
  TInput,
  TEntity extends EntityAny,
  TError = DefaultError,
  TMutateResult = unknown,
> {
  onMutate?: (
    input: TInput,
    entity: TEntity,
    context: MutationFunctionContext,
  ) => (TMutateResult | Promise<TMutateResult | undefined>) | undefined;
  onSuccess?: (
    input: TInput,
    entity: TEntity,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) => void | Promise<void>;
  onError?: (
    error: TError,
    input: TInput,
    entity: TEntity,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) => void | Promise<void>;
  onSettled?: (
    input: TInput,
    entity: TEntity,
    error: TError | null,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) => void | Promise<void>;
}

export interface EntityMutationCallbacks<
  TEntity extends EntityAny,
  TError = DefaultError,
  TMutateResult = unknown,
> {
  onMutate?: (
    entity: TEntity,
    context: MutationFunctionContext,
  ) => (TMutateResult | Promise<TMutateResult | undefined>) | undefined;
  onSuccess?: (
    entity: TEntity,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) => void | Promise<void>;
  onError?: (
    error: TError,
    entity: TEntity,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) => void | Promise<void>;
  onSettled?: (
    entity: TEntity,
    error: TError | null,
    onMutateResult: TMutateResult | undefined,
    context: MutationFunctionContext,
  ) => void | Promise<void>;
}

export interface UseEntityMutationHookOptions<
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
  TEntity extends InstanceType<TEntityConstructor> =
    InstanceType<TEntityConstructor>,
>
  extends
    UseMutationHookCommonOptions<void, TError, void, TMutateResult>,
    OptimisticMutationStrategyOptions,
    EntityMutationCallbacks<TEntity, TError, TMutateResult> {
  entity: TEntityConstructor;
  instance: TEntity;
  mutationFn: MutationFn<void>;
}

export interface EntitiesBatchMutationCallbacks<
  TEntity extends EntityAny,
  TError = DefaultError,
  TMutateResult = unknown,
> {
  onMutate?: (
    entities: TEntity[],
    context: MutationFunctionContext,
  ) => (TMutateResult | Promise<TMutateResult | undefined>) | undefined;
  onSuccess?: (
    entities: TEntity[],
    context: MutationFunctionContext,
    onMutateResult: TMutateResult | undefined,
  ) => void | Promise<void>;
  onError?: (
    error: TError,
    entities: TEntity[],
    context: MutationFunctionContext,
    onMutateResult: TMutateResult | undefined,
  ) => void | Promise<void>;
  onSettled?: (
    entities: TEntity[],
    context: MutationFunctionContext,
    onMutateResult: TMutateResult | undefined,
    error: TError | null,
  ) => void | Promise<void>;
}

export interface UseBatchMutationHookOptions<
  TEntityConstructor extends EntityConstructorAny,
  TError = DefaultError,
  TMutateResult = unknown,
  TEntity extends EntityAny = InstanceType<TEntityConstructor>,
>
  extends
    UseMutationHookCommonOptions<void, TError, TEntity[], TMutateResult>,
    OptimisticMutationStrategyOptions,
    EntitiesBatchMutationCallbacks<TEntity, TError, TMutateResult> {
  entity: TEntityConstructor;
  mutationFn: BatchMutationFn<TEntity>;
}
