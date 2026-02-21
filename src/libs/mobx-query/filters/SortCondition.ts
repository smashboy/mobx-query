import type { EntityAny } from "../entity/Entity";
import type { SortDirection } from "./types";

export class SortCondition<K extends keyof any = any> {
  constructor(
    public readonly field: K,
    public readonly direction: SortDirection,
  ) {}

  apply(entityA: EntityAny, entityB: EntityAny) {
    const field = this.field as string;

    if (!(field in entityA)) {
      throw new Error(`Field ${field} not found in entityA`);
    }

    if (!(field in entityB)) {
      throw new Error(`Field ${field} not found in entityB`);
    }

    const valA = (entityA as any)[field];
    const valB = (entityB as any)[field];
    if (valA < valB) {
      return this.direction === "asc" ? -1 : 1;
    }
    if (valA > valB) {
      return this.direction === "asc" ? 1 : -1;
    }
    return 0;
  }

  static asc<K extends keyof any = any>(field: K) {
    return new SortCondition<K>(field, "asc");
  }

  static desc<K extends keyof any = any>(field: K) {
    return new SortCondition<K>(field, "desc");
  }
}
