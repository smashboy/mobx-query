import { todosCollection } from "../../todos/collection";
import { usersCollection, type UserHydrated } from "../collection";

export const UserListItem: React.FC<{ user: UserHydrated }> = ({ user }) => {
  const deleteUser = usersCollection.useDeleteUserMutation(user);

  const handleDeleteUser = () => deleteUser();
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
      <button style={{ marginLeft: 10 }} onClick={handleDeleteUser}>
        Delete
      </button>
    </li>
  );
};
