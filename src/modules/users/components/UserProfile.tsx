import { wait } from "../../../utils";
import { todosCollection } from "../../todos/collection";
import { TodosList } from "../../todos/components/TodosList";
import { usersCollection } from "../collection";

export const UserProfile: React.FC<{ userId: number }> = ({ userId }) => {
  const user = usersCollection.getUserById.useEntityQuery(userId);

  const updateUser = user.useUpdateMutation(async function updateUser() {
    await wait(1500);
  });
  const todos = todosCollection.getTodosByUserId.useEntityListQuery(userId);

  const handleCloseProfile = () => usersCollection.selectUser(null);
  const handleUpdateUser = () => {
    user.username = "test";
    updateUser();
  };

  return (
    <>
      <button onClick={handleCloseProfile}>Go back</button>
      <button onClick={handleUpdateUser}>Test mutation</button>
      <h3>{user.displayUsername}</h3>
      <h4>{`${user.name} / ${user.email}`}</h4>
      <h4>{`Phone: ${user.phone}`}</h4>
      <h5>{"Todos"}</h5>
      <TodosList todos={todos} />
    </>
  );
};
