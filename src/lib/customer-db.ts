import type { CustomerAccount, SavedLocation } from "./types";

export type CustomerRow = {
  id: string;
  phone: string;
  name: string;
  saved_locations: SavedLocation[];
  created_at: string;
  last_login_at: string;
};

export function customerToRow(c: CustomerAccount): CustomerRow {
  return {
    id: c.id,
    phone: c.phone,
    name: c.name,
    saved_locations: c.savedLocations ?? [],
    created_at: c.createdAt,
    last_login_at: c.lastLoginAt,
  };
}

export function rowToCustomer(row: CustomerRow): CustomerAccount {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    savedLocations: Array.isArray(row.saved_locations) ? row.saved_locations : [],
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
