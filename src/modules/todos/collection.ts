import { action, observable } from "mobx";
import type { TodoDTO } from "../../api/types";
import { queryClient } from "../../libs/react-query";
import { deleteTodo, getTodosByUserId } from "../../api/todos";
import { EntityCollection } from "../../libs/mobx-query/EntityCollection";
import type { EntityHydrated } from "../../libs/mobx-query/Entity";

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

  useTodosByUserIdQuery(userId: number) {
    return this.useSuspenseQueryEntitiesList(getTodosByUserId, userId);
  }

  useDeleteTodoMutation(entity: TodoHydrated) {
    return this.useDeleteMutation(entity, (entity) => deleteTodo(entity.id));
  }
}

export type TodoHydrated = EntityHydrated<TodoDTO, Todo>;

export const todosCollection = new TodosCollection();
