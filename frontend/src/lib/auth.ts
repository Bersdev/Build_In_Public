import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./api";
import type { User } from "./types";

export const ME_KEY = ["me"];

export async function fetchMe(): Promise<User | null> {
  try {
    return await api.get<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError("A API está no ar, mas ainda não tem a autenticação. Essa rota faz parte do backend em construção.", 404);
    }
    throw error;
  }
}

export function useMe() {
  return useQuery<User | null>({ queryKey: ME_KEY, queryFn: fetchMe });
}
