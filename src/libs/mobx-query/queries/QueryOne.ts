import {
  type DefaultError,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type { EntityConstructorAny } from "../entity/Entity";
import type { UseQueryOneOptions } from "./types";
import { QueryOneBase } from "./QueryOneBase";
import { useDeferredValue } from "react";

export class QueryOne<
  TArguments = void,
  TMeta = void,
  TEntityConstructor extends EntityConstructorAny = EntityConstructorAny,
  TError extends DefaultError = DefaultError,
> extends QueryOneBase<TArguments, TMeta, TEntityConstructor, TError> {
  static readonly queryPrefix = "__query__one__";

  constructor(
    options: UseQueryOneOptions<TArguments, TMeta, TEntityConstructor, TError>,
  ) {
    super(QueryOne.queryPrefix, options);
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

    return this.getEntity(res.data);
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

    return this.getEntity(res.data);
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

    if (!res.data) {
      return null;
    }

    return this.getEntity(res.data);
  }
}
