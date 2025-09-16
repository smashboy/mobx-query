import { observable } from "mobx";
import type { TodoDTO } from "../../api/types";
import { EntityCollection, type EntityHydrated } from "../../libs/optimistic";
import { queryClient } from "../../libs/react-query";
import { deleteTodo, getTodosByUserId } from "../../api/todos";

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
}

export class TodosCollection extends EntityCollection<TodoDTO, Todo> {
  constructor() {
    super("todos", queryClient, {
      getEntityId: (todo) => todo.id,
      hydrate: (todo) => new Todo(todo),
    });
  }

  getByUserIdQuery(userId: number) {
    return this.useSuspenseQueryEntitiesList(getTodosByUserId, userId);
  }

  useDeleteTodoMutation(entity: TodoHydrated) {
    return this.useDeleteMutation(entity, (entity) => deleteTodo(entity.id));
  }
}

export type TodoHydrated = EntityHydrated<TodoDTO, Todo>;

export const todosCollection = new TodosCollection();
