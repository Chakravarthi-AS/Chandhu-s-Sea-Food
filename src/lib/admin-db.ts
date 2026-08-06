export type AdminUserRow = {
  id: string;
  username: string;
  password: string;
  display_name: string | null;
  updated_at: string;
};

export type AdminUserPublic = {
  username: string;
  displayName: string | null;
};

export function rowToAdminPublic(row: AdminUserRow): AdminUserPublic {
  return {
    username: row.username,
    displayName: row.display_name,
  };
}
