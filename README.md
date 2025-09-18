# mobx-query

**Combine the best of react-query and mobx** — mobx-query provides a thin integration layer that uses React Query for fetching/invalidations and MobX for storing and mutating observable entities. It supports optimistic mutations with automatic rollbacks on error and automatic invalidation of dependent queries on success.

# Features

- Normalize query responses into a single observable Map per collection.
  
- Hooks make it easy to work with data. Use [useSuspenseQueryEntitiesList](#sample-section) and [useSuspenseQueryEntity](#sample-section) to fetch and hydrate entities. For mutations, [useCreateMutation](#sample-section) and [useDeleteMutation](#sample-section) handle collection-level changes with optimistic updates and invalidations, while [useUpdateMutation](#sample-section) lets you update a single entity directly.
  
- Optimistic updates with automatic query invalidation on successful mutations and rollbacks on error.
  
- Fine-grained, mutable entities powered by MobX (observable fields & actions).

# Quick example

Create the observable entity and wire it into a collection.

```ts
// Your observable entity 
class Todo {
  id: number;
  userId: number;
  @observable accessor title: string;
  @observable accessor isCompleted: boolean;

  constructor(data: TodoDTO) {
    this.id = data.id;
    this.userId = data.userId;
    this.title = data.title;
    this.isCompleted = data.completed;
  }
}

// Collection for a Todo entity
class TodosCollection extends EntityCollection<TodoDTO, Todo> {
  constructor() {
    super("todos", queryClient, {
      getEntityId: (todo) => todo.id,
      hydrate: (todo) => new Todo(todo), // wrap data from queries into observable states
    });
  }

  useTodosByUserIdQuery(userId: number) {
    return this.useSuspenseQueryEntitiesList(getTodosByUserId, userId);
  }

  useDeleteTodoMutation(entity: TodoHydrated) {
    return this.useDeleteMutation(entity, (entity) => deleteTodo(entity.id));
  }
}

type TodoHydrated = EntityHydrated<Todo>;

const todosCollection = new TodosCollection();
```

Use hook from a collection to fetch and retrieve obserbable data

```ts
const TodosList: React.FC<{ userId: number }> = () => {
  const todos = todosCollection.useTodosByUserIdQuery(userId);

   return <List items={todos} />;
};
```

Mutate entity with automatic queries invalidation on mutation success and rollback on error

```ts
const TodoListItem: React.FC<{ todo: TodoHydrated }> = ({ todo }) => {
  const deleteTodo = todosCollection.useDeleteTodoMutation(todo);
  const update = todo.useUpdateMutation(entity => updateTodo(entity));

  const handleDeleteTodo = () => deleteTodo();

  const handleEditTitle = () => {
    const value = prompt("Update title", todo.title);

    if (value) {
      todo.title = value;
      update();
    }
  };

  return (
    <div>
      {todo.title}
      <button onClick={handleEditTitle}>
        Edit
      </button>
      <button onClick={handleDeleteTodo}>
        Delete
      </button>
    </div>
  );
};
