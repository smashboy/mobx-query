import { todosCollection, type TodoHydrated } from "../collection";

export const TodoListItem: React.FC<{ todo: TodoHydrated }> = ({ todo }) => {
  const deleteTodo = todosCollection.useDeleteTodoMutation(todo);
  const updateTodo = todo.useUpdateMutation(async function updateTodo(draft) {
    console.log(draft);
  });

  const handleDeleteTodo = () => deleteTodo();
  const handleEditTitle = () => {
    const value = prompt("Update title", todo.title);

    if (value) {
      todo.title = value;
      // updateTodo();
    }
  };

  return (
    <li style={{ marginBottom: 10 }}>
      {todo.title}
      <button style={{ marginLeft: 10 }} onClick={handleEditTitle}>
        Edit
      </button>
      <button style={{ marginLeft: 10 }} onClick={handleDeleteTodo}>
        Delete
      </button>
    </li>
  );
};
