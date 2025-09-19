import type { EntityId } from "./types";

const COLLECTION_ID_DECREMENTORS = new Map<string, number>();
const CLIENT_ONLY_ENTITY_ID_PREFIX = "entityClientOnlyId_";

export class CollectionIdGenerator {
  private readonly collectionName: string;
  private readonly generateId?: () => EntityId;

  constructor(collectionName: string, generateId?: () => EntityId) {
    this.collectionName = collectionName;
    this.generateId = generateId;

    COLLECTION_ID_DECREMENTORS.set(this.collectionName, 0);
  }

  generateEntityId(): string {
    if (this.generateId) {
      const id = this.generateId();
      return typeof id === "number" ? id.toString() : id;
    }

    let id = COLLECTION_ID_DECREMENTORS.get(this.collectionName)!;
    id--;
    COLLECTION_ID_DECREMENTORS.set(this.collectionName, id);
    return `${CLIENT_ONLY_ENTITY_ID_PREFIX}(${id})`;
  }
}
