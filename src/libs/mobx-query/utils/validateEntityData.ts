import type { EntityDataAny } from "../entity/types";

export function validateEntityData(data: EntityDataAny) {
  if (!("id" in data)) {
    throw new Error("Entity data must have an id");
  }

  return data;
}
