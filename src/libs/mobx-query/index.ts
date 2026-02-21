import { MQClient } from "./client/MQClient";
import { MQClientAccessor } from "./client/MQClientAccessor";
import type {
  MQClientContext,
  MQClientContextRegistered,
} from "./client/types";

export { MQClient, MQClientAccessor };
export type { MQClientContext, MQClientContextRegistered };

import {
  Entity,
  type EntityConstructorAny,
  type EntityAny,
} from "./entity/Entity";
import { EntityCollection } from "./entity/EntityCollection";
import { EntityState } from "./entity/constants";
import type { EntityId, EntityData, EntityDataAny } from "./entity/types";

export { Entity, EntityState, EntityCollection };
export type {
  EntityConstructorAny,
  EntityAny,
  EntityData,
  EntityDataAny,
  EntityId,
};

import type {
  MutationFn,
  BatchMutationFn,
  CreateMutationFn,
  OptimisticMutationStrategyOptions,
  UseCreateMutationHookOptions,
  UseEntityMutationHookOptions,
  UseBatchMutationHookOptions,
} from "./mutations/types";

import { BatchMutationBase } from "./mutations/BatchMutationBase";
import { BatchUpdateMutation } from "./mutations/BatchUpdateMutation";
import { CreateMutation } from "./mutations/CreateMutation";
import { DeleteMutation } from "./mutations/DeleteMutation";
import { EntityMutationBase } from "./mutations/EntityMutationBase";
import { UpdateMutation } from "./mutations/UpdateMutation";
import { MutationBase } from "./mutations/MutationBase";
import {
  OptimisticMutationErrorStrategy,
  OptimisticMutationInvalidationStrategy,
} from "./mutations/constants";

export {
  MutationBase,
  BatchMutationBase,
  EntityMutationBase,
  BatchUpdateMutation,
  CreateMutation,
  DeleteMutation,
  UpdateMutation,
  OptimisticMutationErrorStrategy,
  OptimisticMutationInvalidationStrategy,
};
export type {
  MutationFn,
  BatchMutationFn,
  CreateMutationFn,
  OptimisticMutationStrategyOptions,
  UseCreateMutationHookOptions,
  UseEntityMutationHookOptions,
  UseBatchMutationHookOptions,
};

import type {
  UseQueryManyFunction,
  UseQueryOneOptions,
  UseQueryCommonOptions,
  UseQueryManyOptions,
  UseQueryOneFunction,
} from "./queries/types";

import { QueryBase } from "./queries/QueryBase";
import { QueryFragmentMany } from "./queries/QueryFragmentMany";
import { QueryFragmentOne } from "./queries/QueryFragmentOne";
import { QueryMany } from "./queries/QueryMany";
import { QueryManyBase } from "./queries/QueryManyBase";
import { QueryOne } from "./queries/QueryOne";
import { QueryOneBase } from "./queries/QueryOneBase";

export {
  QueryBase,
  QueryFragmentMany,
  QueryFragmentOne,
  QueryMany,
  QueryManyBase,
  QueryOne,
  QueryOneBase,
};
export type {
  UseQueryCommonOptions,
  UseQueryManyFunction,
  UseQueryManyOptions,
  UseQueryOneFunction,
  UseQueryOneOptions,
};

import { createReactContext } from "./react/createReactContext";
export { createReactContext };

import { generateEntityId } from "./utils/generateEntityId";
import { invalidateQueryByHash } from "./utils/invalidateQueryByHash";
import type { InferEntity, InferEntityData } from "./utils/types";

export { invalidateQueryByHash, generateEntityId };
export type { InferEntity, InferEntityData };
