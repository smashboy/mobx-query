import { EventClient } from "@tanstack/devtools-event-client";

export interface CollectionDataV2 {
  name: string;
  entities: Record<string, any>;
  clientOnlyEntities: string[];
  dirtyEntities: string[];
}

export type MobxDevtoolsEventMapV2 = {
  "mobx-query-v2:collections": {
    collections: CollectionDataV2[];
  };
};

export const mobxDevtoolsEventClientV2 =
  new EventClient<MobxDevtoolsEventMapV2>({
    pluginId: "mobx-query-v2",
  });
