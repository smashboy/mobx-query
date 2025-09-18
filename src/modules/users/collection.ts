import { action, computed, observable } from "mobx";
import type { UserDTO } from "../../api/types";
import { deleteUser, getAllUsers, getUserById } from "../../api/users";
import { queryClient } from "../../libs/react-query";
import { EntityCollection } from "../../libs/mobx-query/EntityCollection";
import type { EntityHydrated } from "../../libs/mobx-query/Entity";

export class User {
  id: number;
  @observable accessor name: string;
  @observable accessor username: string;
  @observable accessor email: string;
  @observable accessor phone: string;

  constructor(data: UserDTO) {
    this.id = data.id;
    this.name = data.name;
    this.username = data.username;
    this.email = data.email;
    this.phone = data.phone;
  }

  @computed
  get displayUsername() {
    return `@${this.username}`;
  }
}

export class UsersCollection extends EntityCollection<UserDTO, User> {
  @observable accessor selectedUserId: number | null = null;

  constructor() {
    super("users", queryClient, {
      getEntityId: (user) => user.id,
      hydrate: (user) => new User(user),
    });
  }

  useAllUsersQuery() {
    return this.useSuspenseQueryEntitiesList(getAllUsers);
  }

  useUserByIdQuery(userId: number) {
    return this.useSuspenseQueryEntity(getUserById, userId);
  }

  useDeleteUserMutation(entity: UserHydrated) {
    return this.useDeleteMutation(entity, (entity) => deleteUser(entity.id));
  }

  @action
  selectUser(user: UserHydrated | null) {
    if (user) {
      this.selectedUserId = user.id;
    } else {
      this.selectedUserId = null;
    }
  }
}

export type UserHydrated = EntityHydrated<User>;

export const usersCollection = new UsersCollection();
