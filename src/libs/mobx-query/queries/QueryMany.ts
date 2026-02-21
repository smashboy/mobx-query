import {
  type DefaultError,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type { UseQueryManyOptions } from "./types";
import { QueryManyBase } from "./QueryManyBase";
import { useDeferredValue } from "react";
import type { EntityConstructorAny } from "../entity/Entity";

export class QueryMany<
  TArguments = void,
  TMeta = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends QueryManyBase<TArguments, TMeta, TEntityConstructor, TError> {
  static readonly queryPrefix = "__query__many__";

  constructor(
    options: UseQueryManyOptions<TArguments, TMeta, TEntityConstructor, TError>,
  ) {
    super(QueryMany.queryPrefix, options);
  }

  useSuspenseQuery(args: TArguments) {
    const queryFn = this.queryFnWrapper(args);

    const res = useSuspenseQuery({
      queryKey: queryFn.queryKey,
      queryFn: () => queryFn.run(),
      ...(this.options.staleTime !== undefined
        ? { staleTime: this.options.staleTime }
        : {}),
      ...(this.options.gcTime !== undefined
        ? { gcTime: this.options.gcTime }
        : {}),
    });

    return this.getEntities(res.data);
  }

  useDeferredQuery(args: TArguments) {
    const deferredArgs = useDeferredValue(args);
    const queryFn = this.queryFnWrapper(deferredArgs);

    const res = useSuspenseQuery({
      queryKey: queryFn.queryKey,
      queryFn: () => queryFn.run(),
      ...(this.options.staleTime !== undefined
        ? { staleTime: this.options.staleTime }
        : {}),
      ...(this.options.gcTime !== undefined
        ? { gcTime: this.options.gcTime }
        : {}),
    });

    return this.getEntities(res.data);
  }

  useQuery(args: TArguments, meta: TMeta) {
    const queryFn = this.queryFnWrapper(args);

    const res = useQuery({
      queryKey: queryFn.queryKey,
      queryFn: () => queryFn.run(),
      enabled:
        typeof this.options.enabled === "function"
          ? this.options.enabled(meta, args)
          : this.options.enabled,
      ...(this.options.staleTime !== undefined
        ? { staleTime: this.options.staleTime }
        : {}),
      ...(this.options.gcTime !== undefined
        ? { gcTime: this.options.gcTime }
        : {}),
    });

    return this.getEntities(res.data ?? []);
  }
}
