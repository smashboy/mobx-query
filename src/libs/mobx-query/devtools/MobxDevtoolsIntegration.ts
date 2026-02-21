import { autorun, toJS } from "mobx";
import { __MOBX_QUERY__ } from "../MQClient";
import { mobxDevtoolsEventClientV2 } from "./MobxDevtoolsEventClient";

export function setupMobxDevtoolsV2() {
  return autorun(() => {
    const managers = Array.from(__MOBX_QUERY__.state.entries());
    const collectionsData = managers.map(([name, manager]) => {
      const entities: Record<string, any> = {};

      for (const [id, entity] of manager.collection.entries()) {
        entities[id as string] = toJS(entity);
      }

      return {
        name,
        entities,
        clientOnlyEntities: Array.from(
          manager.clientOnlyEntityIds.values() as IterableIterator<string>,
        ),
        dirtyEntities: Array.from(manager.collection.values())
          .filter((e) => e.isDirty)
          .map((e) => e.id as string),
      };
    });

    mobxDevtoolsEventClientV2.emit("collections", {
      collections: collectionsData,
    });
  });
}
