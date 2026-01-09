import { action, computed, observable } from "mobx";
import type { UserDTO } from "../../api/types";
import { deleteUser, getAllUsers, getUserById } from "../../api/users";
import { queryClient } from "../../libs/react-query";
import { EntityCollection } from "../../libs/mobx-query/EntityCollection";
import { Entity, type EntityHydrated } from "../../libs/mobx-query/Entity";
import { wait } from "../../utils";

export class User extends Entity {
  id: number;
  @observable accessor name: string;
  @observable accessor username: string;
  @observable accessor email: string;
  @observable accessor phone: string;

  constructor(data: UserDTO) {
    super();
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

  useUpdateProfile() {
    return this.useUpdateMutation(async function updateUser() {
      await wait(1500);
    });
  }
}

export class UsersCollection extends EntityCollection<UserDTO, User> {
  @observable accessor selectedUserId: number | null = null;

  constructor() {
    super("users", queryClient, {
      getEntityId: (user) => user.id,
      hydrate: (user) => new User(user),
      strategyOptions: {
        onMutationErrorStrategy: "keep",
      },
    });
  }

  readonly getAllUsers = this.createSuspenseEntityListQuery(getAllUsers);

  readonly getUserById = this.createSuspenseEntityQuery(getUserById);

  useDeleteUserMutation(entity: UserHydrated) {
    return this.useDeleteMutation(entity, (entity) => deleteUser(entity.id));
  }

  @action selectUser(user: UserHydrated | null) {
    if (user) {
      this.selectedUserId = user.id;
    } else {
      this.selectedUserId = null;
    }
  }
}

export type UserHydrated = EntityHydrated<User>;

export const usersCollection = new UsersCollection();
