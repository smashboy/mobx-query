import type { EntityConstructorAny } from "../entity/Entity";

const ENTITY_ID_INCREMENTORS = new Map<string, number>();
const CLIENT_ONLY_ENTITY_ID_PREFIX = "entityClientOnlyId";

export function generateEntityId(
  entityConstructor: EntityConstructorAny,
): string {
  const id = (ENTITY_ID_INCREMENTORS.get(entityConstructor.name) ?? 0) + 1;
  ENTITY_ID_INCREMENTORS.set(entityConstructor.name, id);
  return `${CLIENT_ONLY_ENTITY_ID_PREFIX}_${entityConstructor.name}_${id}`;
}
