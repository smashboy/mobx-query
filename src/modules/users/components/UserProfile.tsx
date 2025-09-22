import { wait } from "../../../utils";
import { todosCollection, type TodoHydrated } from "../../todos/collection";
import { TodosList } from "../../todos/components/TodosList";
import { usersCollection } from "../collection";

function getUserRelatedClientOnlyTodos(
  userId: number,
  entities: Map<string, TodoHydrated>
) {
  const todos: TodoHydrated[] = [];

  for (const entity of entities.values()) {
    if (entity.userId === userId) {
      todos.push(entity);
    }
  }

  return todos;
}

export const UserProfile: React.FC<{ userId: number }> = ({ userId }) => {
  const user = usersCollection.getUserById.useEntityQuery(userId);

  const updateUser = user.useUpdateMutation(async function updateUser() {
    await wait(1500);
  });

  const todos = todosCollection.getTodosByUserId.useEntityListQuery(userId);
  const clientOnlyTodos = getUserRelatedClientOnlyTodos(
    userId,
    todosCollection.clientOnlyEntities
  );

  const createTodo = todosCollection.useCreateTodoMutation();

  const handleCloseProfile = () => usersCollection.selectUser(null);
  const handleUpdateUser = () => {
    user.username = "test";
    updateUser();
  };
  const handleCreateTodo = () => {
    const value = prompt("Create todo");

    if (value) {
      createTodo({ title: value, userId });
    }
  };

  return (
    <>
      <button onClick={handleCloseProfile}>Go back</button>
      <button onClick={handleUpdateUser}>Test mutation</button>
      <button onClick={handleCreateTodo}>Create Todo</button>
      <h3>{user.displayUsername}</h3>
      <h4>{`${user.name} / ${user.email}`}</h4>
      <h4>{`Phone: ${user.phone}`}</h4>
      <h5>{"Todos"}</h5>
      {clientOnlyTodos.length > 0 && <TodosList todos={clientOnlyTodos} />}
      <TodosList todos={todos} />
    </>
  );
};
