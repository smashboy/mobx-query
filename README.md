# mobx-query

**Reactive server-state management for MobX — powered by TanStack Query.**

mobx-query bridges the gap between [MobX](https://mobx.js.org/) and [TanStack Query](https://tanstack.com/query) by introducing an **entity-based architecture** that turns your server data into observable, self-managing MobX classes. Instead of juggling raw query results and manual cache invalidation, you define **Entity** classes with observable properties, queries, and mutations — and mobx-query keeps everything in sync.

## ✨ Highlights

- 🧩 **Entity-first design** — Model your server data as MobX observable classes with built-in identity tracking
- 🔄 **Automatic normalization** — Entities are deduplicated and shared across queries via an internal `EntityManager`
- ⚡ **Optimistic mutations** — `CreateMutation`, `UpdateMutation`, and `DeleteMutation` with built-in rollback strategies
- 🪝 **React hooks included** — `useSuspenseQuery`, `useDeferredQuery`, and `useMutation` hooks that return hydrated MobX entities
- 🪄 **useDeferredQuery** — Built-in support for React's `useDeferredValue` to prevent UI "flashing" during search/filtering
- 🌐 **Custom context** — Register app-wide context (e.g. your database client) via global namespace augmentation
- 🔍 **Dirty tracking** — Entities track field-level changes with automatic deep-clone snapshots and `reset()` support

## 🚀 Quick Start

### 1. Install

```bash
npm install @mobx-query/core mobx mobx-react-lite @tanstack/react-query
```

### 2. Define an Entity

```ts
import { Entity } from "@mobx-query/core";
import { observable } from "mobx";

export class Todo extends Entity<TodoData> {
  id: string = "";
  @observable accessor title: string = "";
  @observable accessor completed: boolean = false;

  hydrate(data: TodoData) {
    this.id = data.id;
    this.title = data.title;
    this.completed = data.completed;
  }
}
```

### 3. Create a Store with Queries

```ts
import { QueryMany } from "@mobx-query/core";
import { Todo } from "./todo.entity";

export class TodosStore {
  readonly todosQuery = new QueryMany({
    entity: Todo,
    queryKey: () => ["todos"],
    queryFn: async () => {
      const res = await fetch("/api/todos");
      return res.json();
    },
  });
}
```

### 4. Initialize the Client

```ts
import { MQClient } from "@mobx-query/coret";
import { QueryClient } from "@tanstack/react-query";
import { Todo } from "./todo.entity";
import { TodosStore } from "./todos.store";

const queryClient = new QueryClient();

const client = new MQClient<{ todos: TodosStore }>({
  context: { queryClient },
  entities: [Todo],
  rootStore: () => ({ todos: new TodosStore() }),
});
```

### 5. Use in React

```tsx
import { observer } from "mobx-react-lite";
import { useMQ } from "./mqclient";

const TodoList = observer(() => {
  const { rootStore } = useMQ();
  const todos = rootStore.todos.todosQuery.useSuspenseQuery();

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
});
```

## 📖 Documentation

Full documentation is available at **[mobx-query.dev](https://mobx-query.dev)** _(coming soon)_.

## ⚠️ Disclaimer

> **This library is in early development.** The API surface is subject to breaking changes between versions until a stable `1.0` release. Use in production at your own discretion. Feedback and contributions are welcome!

## 📄 License

MIT
