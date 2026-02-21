import { type DefaultError, useQuery } from "@tanstack/react-query";
import type { EntityConstructorAny } from "../entity";
import type { UseQueryOneOptions } from "./types";
import { QueryOneBase } from "./QueryOneBase";

export class QueryFragmentOne<
  TArguments = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends QueryOneBase<TArguments, void, TEntityConstructor, TError> {
  static readonly queryPrefix = "__query__fragment__one__";

  constructor(
    options: UseQueryOneOptions<TArguments, void, TEntityConstructor, TError>,
  ) {
    super(QueryFragmentOne.queryPrefix, options);
  }

  useQuery(args: TArguments) {
    const queryFn = this.queryFnWrapper(args);

    const res = useQuery({
      queryKey: queryFn.queryKey,
      queryFn: () => queryFn.run(),
      staleTime: Infinity,
      gcTime: Infinity,
    });

    if (!res.data) {
      return null;
    }

    return this.getEntity(res.data);
  }
}
