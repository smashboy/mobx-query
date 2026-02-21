export const OptimisticMutationInvalidationStrategy = {
  ALL_QUERIES: "all-queries",
  ALL_ENTITY_QUERIES: "all-entity-queries",
  REFERENCED_QUERIES: "referenced-queries",
  NONE: "none",
} as const;

export const OptimisticMutationErrorStrategy = {
  ROLLBACK: "rollback",
  KEEP: "keep",
} as const;
