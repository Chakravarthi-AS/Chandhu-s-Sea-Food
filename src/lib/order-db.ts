import type { CustomerOrder, OrderLineItem, OrderMode, OrderStatus } from "./types";

export type OrderRow = {
  id: string;
  tracking_code: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  items: OrderLineItem[];
  product_id: string;
  product_name: string;
  mode: OrderMode;
  quantity_kg: number;
  price_per_kg: number;
  total_inr: number;
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
  status: OrderStatus;
  agent_note: string | null;
  delivery_partner_id: string | null;
  created_at: string;
};

export function orderToRow(o: CustomerOrder): OrderRow {
  return {
    id: o.id,
    tracking_code: o.trackingCode,
    customer_id: o.customerId ?? null,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    items: o.items,
    product_id: o.productId,
    product_name: o.productName,
    mode: o.mode,
    quantity_kg: o.quantityKg,
    price_per_kg: o.pricePerKg,
    total_inr: o.totalInr,
    address: o.address,
    lat: o.lat,
    lng: o.lng,
    distance_km: o.distanceKm,
    status: o.status,
    agent_note: o.agentNote ?? null,
    delivery_partner_id: o.deliveryPartnerId ?? null,
    created_at: o.createdAt,
  };
}

export function rowToOrder(row: OrderRow): CustomerOrder {
  const items =
    Array.isArray(row.items) && row.items.length > 0
      ? row.items
      : [
          {
            productId: row.product_id,
            productName: row.product_name,
            mode: row.mode,
            quantityKg: row.quantity_kg,
            pricePerKg: row.price_per_kg,
            lineTotalInr: row.total_inr,
          },
        ];
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    items,
    productId: row.product_id,
    productName: row.product_name,
    mode: row.mode,
    quantityKg: Number(row.quantity_kg),
    pricePerKg: row.price_per_kg,
    totalInr: row.total_inr,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    distanceKm: Number(row.distance_km),
    status: row.status,
    agentNote: row.agent_note ?? undefined,
    deliveryPartnerId: row.delivery_partner_id ?? undefined,
    createdAt: row.created_at,
  };
}
