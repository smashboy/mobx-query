import { usersCollection } from "./modules/users/collection";
import { UserProfile } from "./modules/users/components/UserProfile";
import { UsersList } from "./modules/users/components/UsersList";

const Users = () => {
  const users = usersCollection.getAllUsers.useEntityListQuery(void 0);

  const handleInvalidateUsersQuery = () =>
    usersCollection.getAllUsers.invalidate();

  return (
    <>
      <button onClick={handleInvalidateUsersQuery}>Invalidate</button>
      <UsersList users={users} />
    </>
  );
};

const App = () => {
  if (usersCollection.selectedUserId !== null) {
    return <UserProfile userId={usersCollection.selectedUserId} />;
  }

  return <Users />;
};

export default App;
