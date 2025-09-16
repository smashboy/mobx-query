import type { UserHydrated } from "../collection";
import { UserListItem } from "./UserListItem";

export const UsersList: React.FC<{ users: UserHydrated[] }> = ({ users }) => {
  return (
    <ol>
      {users.map((user) => (
        <UserListItem key={user.entityId} user={user} />
      ))}
    </ol>
  );
};
