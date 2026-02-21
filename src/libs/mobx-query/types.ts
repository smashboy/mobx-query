import { QueryClient } from '@tanstack/react-query'

export interface MQClientContext {
  queryClient: QueryClient
}

/**
 * Global namespace that users can augment to register their custom context type.
 *
 * @example
 * ```ts
 * declare global {
 *   namespace MobXQuery {
 *     interface RegisteredContext {
 *       context: MyCustomContext
 *     }
 *   }
 * }
 * ```
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace MobXQuery {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RegisteredContext {}
  }
}

/**
 * Extracts the user's registered context type or falls back to base MQClientContext.
 * This allows users to define their context type once via global namespace augmentation.
 */
export type MQClientContextRegistered = MobXQuery.RegisteredContext extends {
  context: infer TContext extends MQClientContext
}
  ? TContext
  : MQClientContext
