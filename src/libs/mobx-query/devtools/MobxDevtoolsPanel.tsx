import { useEffect, useState } from "react";
import {
  mobxDevtoolsEventClientV2,
  type CollectionDataV2,
} from "./MobxDevtoolsEventClient";

type EntityViewMode = "all" | "client" | "dirty";

export function MobxDevtoolsPanelV2() {
  const [collections, setCollections] = useState<CollectionDataV2[]>([]);
  const [selectedCollectionName, setSelectedCollectionName] = useState<
    string | null
  >(null);
  const [viewMode, setViewMode] = useState<EntityViewMode>("all");

  useEffect(() => {
    const cleanup = (mobxDevtoolsEventClientV2 as any).on(
      "collections",
      (e: any) => {
        setCollections(e.payload.collections);
        if (e.payload.collections.length > 0 && !selectedCollectionName) {
          setSelectedCollectionName(e.payload.collections[0].name);
        }
      },
    );
    return cleanup;
  }, [selectedCollectionName]);

  const selectedCollection = collections.find(
    (c) => c.name === selectedCollectionName,
  );

  if (collections.length === 0) {
    return (
      <div
        style={{
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          opacity: 0.5,
        }}
      >
        No MobX Query V2 collections found.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        fontFamily: "monospace",
        fontSize: "12px",
        background: "#111",
        color: "#eee",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "200px",
          borderRight: "1px solid #333",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "0.75rem",
            fontWeight: "bold",
            borderBottom: "1px solid #333",
            background: "#000",
          }}
        >
          Collections (V2)
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {collections.map((collection) => (
            <div
              key={collection.name}
              onClick={() => setSelectedCollectionName(collection.name)}
              style={{
                padding: "0.5rem 0.75rem",
                cursor: "pointer",
                background:
                  selectedCollectionName === collection.name
                    ? "#333"
                    : "transparent",
                borderBottom: "1px solid #222",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{collection.name}</span>
              <span style={{ fontSize: "10px", opacity: 0.5 }}>
                {Object.keys(collection.entities).length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedCollection ? (
          <>
            {/* Header & Tabs */}
            <div
              style={{
                padding: "0.75rem",
                borderBottom: "1px solid #333",
                background: "#000",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "0.75rem",
                  fontSize: "14px",
                }}
              >
                {selectedCollection.name}
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <TabButton
                  active={viewMode === "all"}
                  onClick={() => setViewMode("all")}
                  label="All"
                  count={Object.keys(selectedCollection.entities).length}
                />
                <TabButton
                  active={viewMode === "client"}
                  onClick={() => setViewMode("client")}
                  label="Client Only"
                  count={selectedCollection.clientOnlyEntities.length}
                  color="#2196f3"
                />
                <TabButton
                  active={viewMode === "dirty"}
                  onClick={() => setViewMode("dirty")}
                  label="Dirty"
                  count={selectedCollection.dirtyEntities.length}
                  color="#ff9800"
                />
              </div>
            </div>

            {/* Entity List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
              <FilteredEntityList
                collection={selectedCollection}
                mode={viewMode}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.5,
            }}
          >
            Select a collection to view entities
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
  color,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        background: active ? "#444" : "#222",
        border: active ? "1px solid #555" : "1px solid #333",
        color: active ? color || "#fff" : "#888",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "11px",
        display: "flex",
        gap: "6px",
        alignItems: "center",
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: "10px", opacity: 0.7 }}>{count}</span>
    </button>
  );
}

function FilteredEntityList({
  collection,
  mode,
}: {
  collection: CollectionDataV2;
  mode: EntityViewMode;
}) {
  const entityIds = Object.keys(collection.entities).filter((id) => {
    if (mode === "all") return true;
    if (mode === "client") return collection.clientOnlyEntities.includes(id);
    if (mode === "dirty") return collection.dirtyEntities.includes(id);
    return true;
  });

  if (entityIds.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>
        No entities found for this view.
      </div>
    );
  }

  return (
    <div>
      {entityIds.map((id) => (
        <EntityItem
          key={id}
          id={id}
          data={collection.entities[id]}
          isDirty={collection.dirtyEntities.includes(id)}
          isClientOnly={collection.clientOnlyEntities.includes(id)}
        />
      ))}
    </div>
  );
}

function EntityItem({
  id,
  data,
  isDirty,
  isClientOnly,
}: {
  id: string;
  data: any;
  isDirty: boolean;
  isClientOnly: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid #222", padding: "4px 8px" }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "10px", width: "12px" }}>
          {isOpen ? "▼" : "▶"}
        </span>
        <span
          style={{
            color: isDirty ? "#ff9800" : isClientOnly ? "#2196f3" : "#eee",
            fontWeight: isDirty || isClientOnly ? "bold" : "normal",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {id}
        </span>
        <div style={{ flex: 1 }} />
        {isDirty && <Badge label="Dirty" color="#ff9800" />}
        {isClientOnly && <Badge label="Client Only" color="#2196f3" />}
      </div>
      {isOpen && (
        <pre
          style={{
            margin: "8px 0 8px 1.5rem",
            fontSize: "11px",
            background: "#000",
            padding: "8px",
            borderRadius: "4px",
            overflowX: "auto",
            border: "1px solid #222",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "1px 4px",
        background: color + "22",
        border: `1px solid ${color}44`,
        color: color,
        borderRadius: "3px",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}
