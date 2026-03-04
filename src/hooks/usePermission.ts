import { useAuthStore } from "../store/auth";

/**
 * Проверка одного права
 */
export function usePermission(permission: string): boolean {
  return useAuthStore((s) => s.permissions.includes(permission));
}

/**
 * Проверка нескольких прав (все должны быть)
 */
export function usePermissions(permissions: string[]): boolean {
  return useAuthStore((s) =>
    permissions.every((p) => s.permissions.includes(p)),
  );
}

/**
 * Проверка хотя бы одного из прав
 */
export function useAnyPermission(permissions: string[]): boolean {
  return useAuthStore((s) =>
    permissions.some((p) => s.permissions.includes(p)),
  );
}
