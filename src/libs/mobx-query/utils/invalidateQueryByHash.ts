import type { QueryCache } from '@tanstack/react-query'

export function invalidateQueryByHash(
  hash: string,
  cache: QueryCache,
  onQueryNotFound?: (hash: string) => void,
) {
  const query = cache.get(hash)

  if (query) {
    query.invalidate()
    if (query.isActive()) {
      query.fetch()
    }
  } else {
    onQueryNotFound?.(hash)
  }
}
