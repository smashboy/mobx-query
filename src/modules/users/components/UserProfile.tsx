import { todosCollection } from "../../todos/collection";
import { TodosList } from "../../todos/components/TodosList";
import { usersCollection } from "../collection";

export const UserProfile: React.FC<{ userId: number }> = ({ userId }) => {
  const user = usersCollection.useUserByIdQuery(userId);
  const todos = todosCollection.getByUserIdQuery(userId);

  const handleCloseProfile = () => usersCollection.selectUser(null);

  return (
    <>
      <button onClick={handleCloseProfile}>Go back</button>
      <h3>{user.displayUsername}</h3>
      <h4>{`${user.name} / ${user.email}`}</h4>
      <h4>{`Phone: ${user.phone}`}</h4>
      <h5>{"Todos"}</h5>
      <TodosList todos={todos} />
    </>
  );
};
