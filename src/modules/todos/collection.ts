import { action, observable } from "mobx";
import type { TodoDTO } from "../../api/types";
import { queryClient } from "../../libs/react-query";
import { deleteTodo, getTodosByUserId } from "../../api/todos";
import { EntityCollection } from "../../libs/mobx-query/EntityCollection";
import type { EntityHydrated } from "../../libs/mobx-query/Entity";
import { wait } from "../../utils";

export class Todo {
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

  @action
  setTitle(title: string) {
    this.title = title;
  }
}

export class TodosCollection extends EntityCollection<TodoDTO, Todo> {
  constructor() {
    super("todos", queryClient, {
      getEntityId: (todo) => todo.id,
      hydrate: (todo) => new Todo(todo),
    });
  }

  readonly getTodosByUserId =
    this.createSuspenseEntityListQuery(getTodosByUserId);

  useDeleteTodoMutation(entity: TodoHydrated) {
    return this.useDeleteMutation(entity, (entity) => deleteTodo(entity.id));
  }

  useCreateTodoMutation() {
    return this.useCreateMutation(
      async function createTodo(newTodo: { title: string; userId: number }) {
        await wait(1500);
      },
      (input, generatedId) => ({
        // @ts-expect-error: todo type
        id: generatedId,
        title: input.title,
        userId: input.userId,
        completed: false,
      })
    );
  }
}

export type TodoHydrated = EntityHydrated<Todo>;

export const todosCollection = new TodosCollection();
