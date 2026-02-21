import { createContext, useContext } from "react";
import { MQClient } from "../client";

export function createReactContext<TMQClient extends MQClient<any>>() {
  const context = createContext<TMQClient | null>(null);

  return {
    Provider: ({
      children,
      client,
    }: {
      children: React.ReactNode;
      client: TMQClient;
    }) => <context.Provider value={client}>{children}</context.Provider>,
    useContext: () => {
      const ctx = useContext(context);
      if (!ctx) {
        throw new Error("useMQ must be used within an MQProvider");
      }
      return ctx;
    },
  };
}
