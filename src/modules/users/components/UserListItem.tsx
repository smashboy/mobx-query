import { useMutation } from "@tanstack/react-query";
import { todosCollection } from "../../todos/collection";
import { usersCollection, type UserHydrated } from "../collection";
import { wait } from "../../../utils";

export const UserListItem: React.FC<{ user: UserHydrated }> = ({ user }) => {
  const deleteUser = usersCollection.useDeleteUserMutation(user);

  const handleSelectProfile = () => usersCollection.selectUser(user);
  const handlePrefetchProfile = () => {
    usersCollection.getUserById.prefetch(user.id);
    todosCollection.getTodosByUserId.prefetch(user.id);
  };

  return (
    <li style={{ marginBottom: 10 }}>
      {user.displayUsername}
      <button
        onClick={handleSelectProfile}
        onMouseOver={handlePrefetchProfile}
        style={{ marginLeft: 10 }}
      >
        Open Profile
      </button>
      <button style={{ marginLeft: 10 }} onClick={deleteUser}>
        Delete
      </button>
    </li>
  );
};
