import type { EntityAny } from "../entity/Entity";
import type { FilterOperator } from "./types";

export class Condition<T, K extends keyof any = any> {
  constructor(
    public readonly field: K,
    public readonly operator: FilterOperator,
    private readonly valueCallback: (args: T) => any,
    private readonly defaultValue?: any,
  ) {}

  matches(entity: EntityAny) {
    const field = this.field as string;

    if (!(field in entity)) {
      throw new Error(`Field ${field} not found in entity`);
    }

    const val = (entity as any)[field];
  }

  static eq<T, K extends keyof any = any>(
    field: K,
    valueCallback: (args: T) => any,
  ) {
    return new Condition<T, K>(field, "eq", valueCallback);
  }

  static neq<T, K extends keyof any = any>(
    field: K,
    valueCallback: (args: T) => any,
  ) {
    return new Condition<T, K>(field, "neq", valueCallback);
  }

  static gt<T, K extends keyof any = any>(
    field: K,
    valueCallback: (args: T) => any,
  ) {
    return new Condition<T, K>(field, "gt", valueCallback);
  }

  static gte<T, K extends keyof any = any>(
    field: K,
    valueCallback: (args: T) => any,
  ) {
    return new Condition<T, K>(field, "gte", valueCallback);
  }

  static lt<T, K extends keyof any = any>(
    field: K,
    valueCallback: (args: T) => any,
  ) {
    return new Condition<T, K>(field, "lt", valueCallback);
  }

  static lte<T, K extends keyof any = any>(
    field: K,
    valueCallback: (args: T) => any,
  ) {
    return new Condition<T, K>(field, "lte", valueCallback);
  }
}
