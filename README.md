# mobx-query

**The reactive bridge between TanStack Query and MobX.**

Normalized entities, optimistic mutations, and dirty tracking — out of the box.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM version](https://img.shields.io/npm/v/@mobx-query/core.svg)](https://www.npmjs.com/package/@mobx-query/core)

---

## 🧩 Why mobx-query?

You love **MobX** for its fine-grained reactivity and class-based models. You love **TanStack Query** for its battle-tested server-state caching. But gluing them together is painful.

**mobx-query** solves this by turning TanStack Query results into fully reactive MobX entities:

- **One instance per entity** — Shared across all queries via automatic normalization.
- **Built-in optimistic mutations** — Create, Update, and Delete with auto-rollback on error.
- **Field-level dirty tracking** — Know exactly what changed for partial saves or "discard changes" prompts.
- **Referential identity** — Entities keep their identity across refetches, preventing unnecessary UI re-renders.

## 🚀 Installation

```bash
npm install @mobx-query/core @tanstack/react-query mobx mobx-react-lite
```

### TypeScript Configuration

mobx-query uses [TC39 decorators](https://github.com/tc39/proposal-decorators) (Stage 3). Ensure your `tsconfig.json` supports them:

```json
{
  "compilerOptions": {
    "experimentalDecorators": false,
    "useDefineForClassFields": true
  }
}
```

## ⚡ Quick Start

### 1. Define an Entity

```ts
import { Entity, UpdateMutation } from "@mobx-query/core";
import { observable, action } from "mobx";

export class Todo extends Entity<TodoData> {
  id: string = crypto.randomUUID();

  @observable accessor title: string = "";
  @observable accessor completed: boolean = false;

  hydrate(data: TodoData) {
    this.id = data.id;
    this.title = data.title;
    this.completed = data.completed;
  }

  readonly updateMutation = new UpdateMutation({
    entity: Todo,
    instance: this,
    mutationFn: async () => {
      await fetch(`/api/todos/${this.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: this.completed }),
      });
    },
  });

  @action toggle() {
    this.completed = !this.completed;
    this.updateMutation.mutate(); // Checks isDirty internally before calling API
  }
}
```

### 2. Create a Store

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

### 3. Initialize & Use in React

```tsx
import { observer } from "mobx-react-lite";
import { useMQ } from "./mq-setup";

const TodoList = observer(() => {
  const { rootStore } = useMQ();
  const todos = rootStore.todos.todosQuery.useSuspenseQuery();

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id} onClick={() => todo.toggle()}>
          {todo.title} {todo.completed ? "✅" : "❌"}
        </li>
      ))}
    </ul>
  );
});
```

## 📖 Documentation

Full documentation is available at **[mobx-query.dev](https://mobx-query.dev)**.

## 📄 License

MIT
