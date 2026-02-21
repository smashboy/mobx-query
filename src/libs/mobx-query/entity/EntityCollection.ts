import { action, computed, observable } from "mobx";
import type { EntityConstructor, EntityConstructorAny } from "./Entity";
import { QueryClient } from "@tanstack/react-query";
import type { EntityDataAny, EntityId } from "./types";

export class EntityCollection<
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
> {
  @observable accessor collection = new Map<
    EntityId,
    InstanceType<TEntityConstructor>
  >();
  @observable accessor deletedRecordIds = new Set<EntityId>();
  @observable accessor clientOnlyEntityIds = new Set<EntityId>();

  constructor(
    private readonly entityConstructor: EntityConstructor<
      any,
      any,
      InstanceType<TEntityConstructor>
    >,
    private readonly queryClient: QueryClient,
  ) {
    this.initQueryClientCacheListener();
  }

  @computed get size() {
    return this.collection.size;
  }

  @computed get entities() {
    const entities: InstanceType<TEntityConstructor>[] = [];

    for (const entity of this.collection.values()) {
      if (this.deletedRecordIds.has(entity.id)) continue;
      entities.push(entity);
    }

    return entities;
  }

  @computed get clientOnlyEntitiesMap() {
    const entities = new Map<EntityId, InstanceType<TEntityConstructor>>();

    for (const entityId of this.clientOnlyEntityIds.values()) {
      const entity = this.collection.get(entityId);

      if (!entity) {
        continue;
      }

      entities.set(entityId, entity);
    }

    return entities;
  }

  @computed get clientOnlyEntities() {
    const entities: InstanceType<TEntityConstructor>[] = [];

    for (const entityId of this.clientOnlyEntityIds.values()) {
      const entity = this.collection.get(entityId);

      if (!entity) {
        continue;
      }

      entities.push(entity);
    }

    return entities;
  }

  @action setEntity(data: EntityDataAny, queryHashes?: string[]) {
    // if (clearQueryHashes && queryHashes) {
    //   console.log('clearQueryHashes', queryHashes)
    //   this.removeQueryHashesFromAllEntities(queryHashes)
    // }

    const entity =
      new this.entityConstructor() as InstanceType<TEntityConstructor>;
    entity.hydrate(data);
    entity._markAsHydrated();

    const prevEntity = this.collection.get(entity.id) as
      | InstanceType<TEntityConstructor>
      | undefined;

    const updatedQueryHashes = prevEntity
      ? [...prevEntity.queryHashes, ...(queryHashes || [])]
      : [...(queryHashes || [])];

    if (prevEntity) {
      if (queryHashes) {
        for (const hash of queryHashes) {
          prevEntity.queryHashes.add(hash);
        }
      }

      prevEntity.hydrate(data);
      prevEntity._clearDirty();

      return prevEntity;
    }

    entity._init(updatedQueryHashes, {
      onAllQueryHashesRemoved: (entityId: EntityId) =>
        this.deleteEntity(entityId),
    });

    this.collection.set(entity.id, entity);
    return entity;
  }

  @action setEntities(entityData: EntityDataAny[], queryHashes: string[]) {
    const entities: InstanceType<TEntityConstructor>[] = [];
    const ids: EntityId[] = [];

    if (!Array.isArray(entityData)) {
      throw new Error("setEntities: entityData must be an array");
    }

    if (queryHashes) {
      this.removeQueryHashesFromAllEntities(queryHashes);
    }

    for (const record of entityData) {
      const entity = this.setEntity(record, queryHashes);
      entities.push(entity);
      ids.push(entity.id);
    }

    return [entities, ids] as const;
  }

  @action deleteEntity(entityId: EntityId) {
    this.collection.delete(entityId);
    this.clientOnlyEntityIds.delete(entityId);
    this.deletedRecordIds.delete(entityId);
  }

  getEntityById(entityId: EntityId) {
    return this.collection.get(entityId);
  }

  filter(
    predicate: (
      value: InstanceType<TEntityConstructor>,
      index: number,
    ) => boolean,
  ): InstanceType<TEntityConstructor>[] {
    const result: InstanceType<TEntityConstructor>[] = [];
    let i = 0;
    for (const entity of this.collection.values()) {
      if (this.deletedRecordIds.has(entity.id)) continue;
      if (predicate(entity, i++)) {
        result.push(entity);
      }
    }
    return result;
  }

  find(
    predicate: (
      value: InstanceType<TEntityConstructor>,
      index: number,
    ) => boolean,
  ): InstanceType<TEntityConstructor> | undefined {
    let i = 0;
    for (const entity of this.collection.values()) {
      if (this.deletedRecordIds.has(entity.id)) continue;
      if (predicate(entity, i++)) {
        return entity;
      }
    }
    return undefined;
  }

  findIndex(
    predicate: (
      value: InstanceType<TEntityConstructor>,
      index: number,
    ) => boolean,
  ): number {
    let i = 0;
    for (const entity of this.collection.values()) {
      if (this.deletedRecordIds.has(entity.id)) continue;
      if (predicate(entity, i)) {
        return i;
      }
      i++;
    }
    return -1;
  }

  findLast(
    predicate: (
      value: InstanceType<TEntityConstructor>,
      index: number,
    ) => boolean,
  ): InstanceType<TEntityConstructor> | undefined {
    const entities = this.entities;
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      if (predicate(entity, i)) {
        return entity;
      }
    }
    return undefined;
  }

  findLastIndex(
    predicate: (
      value: InstanceType<TEntityConstructor>,
      index: number,
    ) => boolean,
  ): number {
    const entities = this.entities;
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      if (predicate(entity, i)) {
        return i;
      }
    }
    return -1;
  }

  some(
    predicate: (
      value: InstanceType<TEntityConstructor>,
      index: number,
    ) => boolean,
  ): boolean {
    let i = 0;
    for (const entity of this.collection.values()) {
      if (this.deletedRecordIds.has(entity.id)) continue;
      if (predicate(entity, i++)) {
        return true;
      }
    }
    return false;
  }

  every(
    predicate: (
      value: InstanceType<TEntityConstructor>,
      index: number,
    ) => boolean,
  ): boolean {
    let i = 0;
    for (const entity of this.collection.values()) {
      if (this.deletedRecordIds.has(entity.id)) continue;
      if (!predicate(entity, i++)) {
        return false;
      }
    }
    return true;
  }

  map<T>(
    predicate: (value: InstanceType<TEntityConstructor>, index: number) => T,
  ): T[] {
    const result: T[] = [];
    let i = 0;
    for (const entity of this.collection.values()) {
      if (this.deletedRecordIds.has(entity.id)) continue;
      result.push(predicate(entity, i++));
    }
    return observable.array(result);
  }

  private initQueryClientCacheListener() {
    this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "removed") {
        this.removeQueryHashesFromAllEntities([event.query.queryHash]);
      }
    });
  }

  private removeQueryHashesFromAllEntities(hashes: string[]) {
    for (const entity of this.collection.values()) {
      entity._removeQueryHashes(hashes);
    }
  }
}
