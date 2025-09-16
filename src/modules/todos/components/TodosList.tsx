import type { TodoHydrated } from "../collection";
import { TodoListItem } from "./TodoListItem";

export const TodosList: React.FC<{ todos: TodoHydrated[] }> = ({ todos }) => {
  return (
    <ol>
      {todos.map((todo) => (
        <TodoListItem key={todo.entityId} todo={todo} />
      ))}
    </ol>
  );
};
