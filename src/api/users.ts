import { wait } from "../utils";
import { apiFetch } from "./fetch";
import type { UserDTO } from "./types";

export function getAllUsers() {
  return apiFetch<UserDTO[]>("/users");
}

export function getUserById(userId: number) {
  return apiFetch<UserDTO>(`/users/${userId}`);
}

export async function deleteUser(userId: number) {
  await wait(1500);

  throw new Error("Oops");

  return apiFetch<void>(`/users/${userId}`, {
    method: "DELETE",
  });
}
