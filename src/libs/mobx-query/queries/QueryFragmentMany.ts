import { type DefaultError, useQuery } from "@tanstack/react-query";
import type { EntityConstructorAny } from "../entity";
import type { UseQueryManyOptions } from "./types";
import { QueryManyBase } from "./QueryManyBase";

export class QueryFragmentMany<
  TArguments = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends QueryManyBase<TArguments, void, TEntityConstructor, TError> {
  static readonly queryPrefix = "__query__fragment__many__";

  constructor(
    options: UseQueryManyOptions<TArguments, void, TEntityConstructor, TError>,
  ) {
    super(QueryFragmentMany.queryPrefix, options);
  }

  useQuery(args: TArguments) {
    const queryFn = this.queryFnWrapper(args);

    const res = useQuery({
      queryKey: queryFn.queryKey,
      queryFn: () => queryFn.run(),
      staleTime: Infinity,
      gcTime: Infinity,
    });

    return this.getEntities(res.data ?? []);
  }
}
