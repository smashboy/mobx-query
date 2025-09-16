import { apiFetch } from "./fetch";
import type { TodoDTO } from "./types";

export function getTodosByUserId(userId: number) {
  return apiFetch<TodoDTO[]>("/todos", {
    params: new Map([["userId", userId.toString()]]),
  });
}

export async function deleteTodo(todoId: number) {
  return apiFetch<void>(`/todos/${todoId}`, {
    method: "DELETE",
  });
}
