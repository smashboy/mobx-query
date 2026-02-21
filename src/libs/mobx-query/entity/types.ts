export type EntityId = string | number;

export interface EntityData<TEntityId extends EntityId = string> {
  id: TEntityId;
}

export type EntityDataAny = EntityData<EntityId>;

export interface EntityEvents<TEntityId extends EntityId = string> {
  onAllQueryHashesRemoved: (entityId: TEntityId) => void;
}
