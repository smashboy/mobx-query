import { todosCollection, type TodoHydrated } from "../collection";

export const TodoListItem: React.FC<{ todo: TodoHydrated }> = ({ todo }) => {
  const deleteTodo = todosCollection.useDeleteTodoMutation(todo);

  const handleDeleteTodo = () => deleteTodo();

  return (
    <li style={{ marginBottom: 10 }}>
      {todo.title}
      <button style={{ marginLeft: 10 }}>Edit</button>
      <button style={{ marginLeft: 10 }} onClick={handleDeleteTodo}>
        Delete
      </button>
    </li>
  );
};
