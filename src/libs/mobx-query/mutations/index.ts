import type {
  MutationFn,
  BatchMutationFn,
  CreateMutationFn,
  OptimisticMutationStrategyOptions,
  UseCreateMutationHookOptions,
  UseEntityMutationHookOptions,
  UseBatchMutationHookOptions,
} from "./types";

import { BatchMutationBase } from "./BatchMutationBase";
import { BatchUpdateMutation } from "./BatchUpdateMutation";
import { CreateMutation } from "./CreateMutation";
import { DeleteMutation } from "./DeleteMutation";
import { EntityMutationBase } from "./EntityMutationBase";
import { UpdateMutation } from "./UpdateMutation";
import { MutationBase } from "./MutationBase";

import {
  OptimisticMutationErrorStrategy,
  OptimisticMutationInvalidationStrategy,
} from "./constants";

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
