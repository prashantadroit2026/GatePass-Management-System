"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { User } from "@/types/api";
export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api<User>("/users/me"), retry: false });
