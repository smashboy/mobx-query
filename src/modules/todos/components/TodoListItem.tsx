import { todosCollection, type TodoHydrated } from "../collection";

export const TodoListItem: React.FC<{ todo: TodoHydrated }> = ({ todo }) => {
  const deleteTodo = todosCollection.useDeleteTodoMutation(todo);

  const update = todo.useUpdateTodo();

  const handleEditTitle = () => {
    const value = prompt("Update title", todo.title);

    if (value) {
      todo.title = value;
      update();
    }
  };

  return (
    <li style={{ marginBottom: 10 }}>
      {todo.title}
      <button style={{ marginLeft: 10 }} onClick={handleEditTitle}>
        Edit
      </button>
      <button style={{ marginLeft: 10 }} onClick={deleteTodo}>
        Delete
      </button>
    </li>
  );
};
