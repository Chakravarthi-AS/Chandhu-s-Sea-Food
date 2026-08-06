"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_STATE, normalizePhone } from "./defaults";
import {
  fetchProductsFromServer,
  removeProductOnServer,
  replaceProductsOnServer,
  upsertProductOnServer,
} from "./products-api";
import {
  fetchAdminUserFromServer,
  loginAdminOnServer,
  saveAdminUserOnServer,
} from "./admin-auth-api";
import {
  fetchCustomerFromServer,
  updateCustomerOnServer,
  upsertCustomerOnServer,
} from "./customers-api";
import {
  createOrderOnServer,
  fetchOrdersFromServer,
  patchOrderOnServer,
} from "./orders-api";
import { clearAdminApiSecret, getAdminApiSecret, setAdminApiSecret } from "./admin-api";
import type {
  AppState,
  CustomerAccount,
  CustomerOrder,
  DeliveryPartner,
  OrderLineItem,
  PendingOtp,
  Product,
  SavedLocation,
  ShopConfig,
} from "./types";

const STORAGE_KEY = "chandhu-sea-food-demo-v5";
const ADMIN_SESSION_KEY = "csf-admin-session";
const CUSTOMER_SESSION_KEY = "csf-customer-session";

type StoreContextValue = {
  ready: boolean;
  /** True while menu products are loading from Supabase */
  productsLoading: boolean;
  /** True when Supabase env is set — menu is shared for all visitors */
  serverMenuConfigured: boolean;
  state: AppState;
  adminLoggedIn: boolean;
  customer: CustomerAccount | null;
  pendingOtp: PendingOtp | null;
  resetDemo: () => void;
  updateConfig: (patch: Partial<ShopConfig>) => void;
  updateProductPrice: (
    productId: string,
    pricePerKg: number,
    bulkPricePerKg: number
  ) => void;
  replaceProductsPrices: (products: Product[]) => Promise<boolean>;
  upsertProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  upsertPartner: (partner: DeliveryPartner) => void;
  removePartner: (id: string) => void;
  placeOrder: (
    order: Omit<
      CustomerOrder,
      "id" | "createdAt" | "trackingCode" | "status" | "agentNote"
    >
  ) => Promise<CustomerOrder>;
  setOrderStatus: (
    orderId: string,
    status: CustomerOrder["status"],
    extras?: { agentNote?: string; deliveryPartnerId?: string }
  ) => void;
  getOrderByTracking: (code: string) => CustomerOrder | undefined;
  getProduct: (id: string) => Product | undefined;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  requestOtp: (phone: string) => { ok: boolean; message: string; demoCode?: string };
  verifyOtp: (
    phone: string,
    code: string,
    name?: string
  ) => { ok: boolean; message: string; customer?: CustomerAccount };
  logoutCustomer: () => void;
  saveCustomerLocation: (
    location: Omit<SavedLocation, "id" | "createdAt">,
    phoneOverride?: string
  ) => void;
  removeCustomerLocation: (locationId: string) => void;
  updateCustomerName: (name: string, phoneOverride?: string) => void;
  getCustomerOrders: () => CustomerOrder[];
  syncProductsToServer: (products: Product[]) => Promise<boolean>;
  refreshOrdersFromServer: () => Promise<void>;
  saveAdminCredentialsToServer: (
    username: string,
    password: string
  ) => Promise<boolean>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function mergeOrders(
  local: CustomerOrder[],
  remote: CustomerOrder[]
): CustomerOrder[] {
  const map = new Map<string, CustomerOrder>();
  for (const o of local) map.set(o.id, o);
  for (const o of remote) map.set(o.id, o);
  return [...map.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

function mergeCustomerIntoList(
  customers: CustomerAccount[],
  account: CustomerAccount
): CustomerAccount[] {
  const phone = normalizePhone(account.phone);
  const exists = customers.some((c) => normalizePhone(c.phone) === phone);
  if (!exists) return [...customers, account];
  return customers.map((c) =>
    normalizePhone(c.phone) === phone ? { ...c, ...account } : c
  );
}

function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("chandhu-sea-food-demo-v3") ??
      localStorage.getItem("chandhu-sea-food-demo-v2") ??
      localStorage.getItem("chandhu-sea-food-demo-v1");
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const savedProducts = (parsed.products ?? []).map((p) => ({
      ...p,
      description: "",
    }));
    const products =
      savedProducts.length > 0
        ? savedProducts.map((p) => ({
            ...p,
            active: p.active !== false,
          }))
        : DEFAULT_STATE.products;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      config: {
        ...DEFAULT_STATE.config,
        ...parsed.config,
        // Always prefer current default hub text if still on old Alipiri demo address
        hubAddress:
          parsed.config?.hubAddress &&
          !parsed.config.hubAddress.toLowerCase().includes("alipiri")
            ? parsed.config.hubAddress
            : DEFAULT_STATE.config.hubAddress,
        hubLat:
          parsed.config?.hubAddress &&
          !parsed.config.hubAddress.toLowerCase().includes("alipiri")
            ? (parsed.config.hubLat ?? DEFAULT_STATE.config.hubLat)
            : DEFAULT_STATE.config.hubLat,
        hubLng:
          parsed.config?.hubAddress &&
          !parsed.config.hubAddress.toLowerCase().includes("alipiri")
            ? (parsed.config.hubLng ?? DEFAULT_STATE.config.hubLng)
            : DEFAULT_STATE.config.hubLng,
        adminUsername:
          parsed.config?.adminUsername ?? DEFAULT_STATE.config.adminUsername,
        adminPassword:
          parsed.config?.adminPassword ?? DEFAULT_STATE.config.adminPassword,
      },
      products,
      partners: parsed.partners ?? DEFAULT_STATE.partners,
      orders: (parsed.orders ?? []).map((o) => ({
        ...o,
        items:
          o.items?.length > 0
            ? o.items
            : [
                {
                  productId: o.productId,
                  productName: o.productName,
                  mode: o.mode,
                  quantityKg: o.quantityKg,
                  pricePerKg: o.pricePerKg,
                  lineTotalInr: o.totalInr,
                } satisfies OrderLineItem,
              ],
      })),
      customers: parsed.customers ?? [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function trackingCode(): string {
  return `CSF-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function makeOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [serverMenuConfigured, setServerMenuConfigured] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [pendingOtp, setPendingOtp] = useState<PendingOtp | null>(null);

  useEffect(() => {
    async function init() {
      const local = loadState();
      setState(local);

      const adminSession = sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
      const sessPhone = sessionStorage.getItem(CUSTOMER_SESSION_KEY);
      if (adminSession && !getAdminApiSecret()) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setAdminLoggedIn(false);
      } else {
        setAdminLoggedIn(adminSession);
      }
      if (sessPhone) setCustomerPhone(normalizePhone(sessPhone));
      // Site UI is ready immediately — only products wait on the API
      setReady(true);

      let configured = false;
      setProductsLoading(true);
      try {
        const { configured: productsConfigured, products } =
          await fetchProductsFromServer();
        configured = productsConfigured;
        setServerMenuConfigured(configured);
        if (configured && products.length > 0) {
          setState((s) => ({ ...s, products }));
        }
      } catch {
        setServerMenuConfigured(false);
      } finally {
        setProductsLoading(false);
      }

      if (configured) {
        try {
          const adminUser = await fetchAdminUserFromServer();
          if (adminUser.configured && adminUser.username) {
            setState((s) => ({
              ...s,
              config: { ...s.config, adminUsername: adminUser.username! },
            }));
          }
        } catch {
          /* keep local admin username */
        }
      }

      if (configured && sessPhone) {
        const phone = normalizePhone(sessPhone);
        try {
          const { customer } = await fetchCustomerFromServer(phone);
          if (customer) {
            setState((s) => ({
              ...s,
              customers: mergeCustomerIntoList(s.customers, customer),
            }));
          }
          const { orders } = await fetchOrdersFromServer({ phone });
          if (orders.length > 0) {
            setState((s) => ({
              ...s,
              orders: mergeOrders(s.orders, orders),
            }));
          }
        } catch {
          /* local fallback */
        }
      }

      if (configured && adminSession && getAdminApiSecret()) {
        try {
          const { orders } = await fetchOrdersFromServer({ asAdmin: true });
          if (orders.length > 0) {
            setState((s) => ({
              ...s,
              orders: mergeOrders(s.orders, orders),
            }));
          }
        } catch {
          /* local fallback */
        }
      }
    }
    void init();
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const customer = useMemo(() => {
    if (!customerPhone) return null;
    return (
      state.customers.find((c) => normalizePhone(c.phone) === customerPhone) ??
      null
    );
  }, [state.customers, customerPhone]);

  const resetDemo = useCallback(() => {
    const fresh = structuredClone(DEFAULT_STATE);
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
    setAdminLoggedIn(false);
    setCustomerPhone(null);
    setPendingOtp(null);
  }, []);

  const updateConfig = useCallback((patch: Partial<ShopConfig>) => {
    setState((s) => ({ ...s, config: { ...s.config, ...patch } }));
  }, []);

  const updateProductPrice = useCallback(
    (productId: string, pricePerKg: number, bulkPricePerKg: number) => {
      setState((s) => ({
        ...s,
        products: s.products.map((p) =>
          p.id === productId ? { ...p, pricePerKg, bulkPricePerKg } : p
        ),
      }));
    },
    []
  );

  const replaceProductsPrices = useCallback(
    async (products: Product[]) => {
      setState((s) => ({ ...s, products }));
      if (!serverMenuConfigured) return true;
      return replaceProductsOnServer(products);
    },
    [serverMenuConfigured]
  );

  const upsertProduct = useCallback((product: Product) => {
    const cleaned: Product = {
      ...product,
      description: "",
      active: product.active !== false,
    };
    setState((s) => {
      const exists = s.products.some((p) => p.id === cleaned.id);
      return {
        ...s,
        products: exists
          ? s.products.map((p) => (p.id === cleaned.id ? cleaned : p))
          : [...s.products, cleaned],
      };
    });
    void upsertProductOnServer(cleaned);
  }, []);

  const removeProduct = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      products: s.products.filter((p) => p.id !== id),
    }));
    void removeProductOnServer(id);
  }, []);

  const syncProductsToServer = useCallback(async (products: Product[]) => {
    return replaceProductsOnServer(products);
  }, []);

  const upsertPartner = useCallback((partner: DeliveryPartner) => {
    setState((s) => {
      const exists = s.partners.some((p) => p.id === partner.id);
      return {
        ...s,
        partners: exists
          ? s.partners.map((p) => (p.id === partner.id ? partner : p))
          : [...s.partners, partner],
      };
    });
  }, []);

  const removePartner = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      partners: s.partners.filter((p) => p.id !== id),
    }));
  }, []);

  const placeOrder = useCallback(
    async (
      order: Omit<
        CustomerOrder,
        "id" | "createdAt" | "trackingCode" | "status" | "agentNote"
      >
    ): Promise<CustomerOrder> => {
      const phoneNorm = normalizePhone(order.customerPhone);
      const existing = state.customers.find(
        (c) => normalizePhone(c.phone) === phoneNorm
      );
      const autoConfirm = order.quantityKg >= state.config.minKgForExtended;
      const created: CustomerOrder = {
        ...order,
        items: order.items?.length
          ? order.items
          : [
              {
                productId: order.productId,
                productName: order.productName,
                mode: order.mode,
                quantityKg: order.quantityKg,
                pricePerKg: order.pricePerKg,
                lineTotalInr: order.totalInr,
              },
            ],
        customerId: order.customerId ?? existing?.id,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        trackingCode: trackingCode(),
        status: autoConfirm ? "confirmed" : "pending_agent",
        agentNote: autoConfirm
          ? `Auto-confirmed — total ${order.quantityKg} kg (≥ ${state.config.minKgForExtended} kg).`
          : undefined,
      };
      setState((s) => ({ ...s, orders: [created, ...s.orders] }));
      if (serverMenuConfigured) {
        const cust: CustomerAccount =
          existing ??
          ({
            id: created.customerId ?? crypto.randomUUID(),
            phone: phoneNorm,
            name: order.customerName,
            savedLocations: [],
            createdAt: created.createdAt,
            lastLoginAt: created.createdAt,
          } satisfies CustomerAccount);
        await Promise.all([
          createOrderOnServer(created),
          upsertCustomerOnServer(cust),
        ]);
      }
      return created;
    },
    [state.customers, state.config.minKgForExtended, serverMenuConfigured]
  );

  const setOrderStatus = useCallback(
    (
      orderId: string,
      status: CustomerOrder["status"],
      extras?: { agentNote?: string; deliveryPartnerId?: string }
    ) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status,
                ...(extras?.agentNote !== undefined
                  ? { agentNote: extras.agentNote }
                  : {}),
                ...(extras?.deliveryPartnerId !== undefined
                  ? { deliveryPartnerId: extras.deliveryPartnerId }
                  : {}),
              }
            : o
        ),
      }));
      if (serverMenuConfigured) {
        void patchOrderOnServer(orderId, {
          status,
          agentNote: extras?.agentNote,
          deliveryPartnerId: extras?.deliveryPartnerId,
        });
      }
    },
    [serverMenuConfigured]
  );

  const getOrderByTracking = useCallback(
    (code: string) =>
      state.orders.find(
        (o) => o.trackingCode.toLowerCase() === code.trim().toLowerCase()
      ),
    [state.orders]
  );

  const getProduct = useCallback(
    (id: string) => state.products.find((p) => p.id === id),
    [state.products]
  );

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      let ok = false;
      if (serverMenuConfigured) {
        const result = await loginAdminOnServer(username, password);
        ok = result.ok;
        if (ok && result.username) {
          setState((s) => ({
            ...s,
            config: { ...s.config, adminUsername: result.username! },
          }));
        }
      }
      if (!ok) {
        ok =
          username.trim() === state.config.adminUsername &&
          password === state.config.adminPassword;
      }
      if (ok) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        setAdminApiSecret(password);
        setAdminLoggedIn(true);
        if (serverMenuConfigured) {
          const { orders } = await fetchOrdersFromServer({ asAdmin: true });
          if (orders.length > 0) {
            setState((s) => ({
              ...s,
              orders: mergeOrders(s.orders, orders),
            }));
          }
        }
      }
      return ok;
    },
    [
      state.config.adminUsername,
      state.config.adminPassword,
      serverMenuConfigured,
    ]
  );

  const refreshOrdersFromServer = useCallback(async () => {
    if (!serverMenuConfigured) return;
    if (adminLoggedIn && getAdminApiSecret()) {
      const { orders } = await fetchOrdersFromServer({ asAdmin: true });
      setState((s) => ({ ...s, orders: mergeOrders(s.orders, orders) }));
      return;
    }
    if (customerPhone) {
      const { orders } = await fetchOrdersFromServer({ phone: customerPhone });
      setState((s) => ({ ...s, orders: mergeOrders(s.orders, orders) }));
    }
  }, [serverMenuConfigured, adminLoggedIn, customerPhone]);

  const saveAdminCredentialsToServer = useCallback(
    async (username: string, password: string) => {
      if (!serverMenuConfigured) return true;
      return saveAdminUserOnServer({ username, password });
    },
    [serverMenuConfigured]
  );

  const logoutAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    clearAdminApiSecret();
    setAdminLoggedIn(false);
  }, []);

  const requestOtp = useCallback((phone: string) => {
    const n = normalizePhone(phone);
    if (n.length !== 10) {
      return { ok: false, message: "Enter a valid 10-digit Indian mobile number." };
    }
    const code = makeOtp();
    setPendingOtp({
      phone: n,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return {
      ok: true,
      message: "OTP sent (demo — shown on screen).",
      demoCode: code,
    };
  }, []);

  const verifyOtp = useCallback(
    (phone: string, code: string, name?: string) => {
      const n = normalizePhone(phone);
      if (!pendingOtp || pendingOtp.phone !== n) {
        return { ok: false, message: "Request a new OTP first." };
      }
      if (Date.now() > pendingOtp.expiresAt) {
        setPendingOtp(null);
        return { ok: false, message: "OTP expired. Request a new one." };
      }
      if (code.trim() !== pendingOtp.code) {
        return { ok: false, message: "Incorrect OTP. Try again." };
      }

      const now = new Date().toISOString();
      const existing = state.customers.find(
        (c) => normalizePhone(c.phone) === n
      );
      const account: CustomerAccount = existing
        ? {
            ...existing,
            name: name?.trim() || existing.name,
            lastLoginAt: now,
          }
        : {
            id: crypto.randomUUID(),
            phone: n,
            name: name?.trim() || "Customer",
            savedLocations: [],
            createdAt: now,
            lastLoginAt: now,
          };

      setState((s) => {
        const found = s.customers.find((c) => normalizePhone(c.phone) === n);
        if (found) {
          const nextCustomers = s.customers.map((c) =>
            c.id === found.id
              ? {
                  ...c,
                  name: name?.trim() || c.name,
                  lastLoginAt: now,
                }
              : c
          );
          const updated = nextCustomers.find((c) => c.id === found.id);
          if (serverMenuConfigured && updated) {
            void upsertCustomerOnServer(updated);
          }
          return { ...s, customers: nextCustomers };
        }
        const nextCustomers = [...s.customers, account];
        if (serverMenuConfigured) {
          void upsertCustomerOnServer(account);
        }
        return { ...s, customers: nextCustomers };
      });

      sessionStorage.setItem(CUSTOMER_SESSION_KEY, n);
      setCustomerPhone(n);
      setPendingOtp(null);
      return {
        ok: true,
        message: "Logged in successfully.",
        customer: account,
      };
    },
    [pendingOtp, state.customers, serverMenuConfigured]
  );

  const logoutCustomer = useCallback(() => {
    sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
    setCustomerPhone(null);
  }, []);

  const saveCustomerLocation = useCallback(
    (location: Omit<SavedLocation, "id" | "createdAt">, phoneOverride?: string) => {
      const target = normalizePhone(phoneOverride || customerPhone || "");
      if (!target) return;
      setState((s) => {
        const nextCustomers = s.customers.map((c) => {
          if (normalizePhone(c.phone) !== target) return c;
          const duplicate = c.savedLocations.some(
            (l) =>
              l.address.trim().toLowerCase() ===
                location.address.trim().toLowerCase() &&
              Math.abs(l.lat - location.lat) < 0.0001 &&
              Math.abs(l.lng - location.lng) < 0.0001
          );
          if (duplicate) return c;
          const entry: SavedLocation = {
            ...location,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          };
          return {
            ...c,
            savedLocations: [entry, ...c.savedLocations].slice(0, 8),
          };
        });
        const updated = nextCustomers.find(
          (c) => normalizePhone(c.phone) === target
        );
        if (serverMenuConfigured && updated) {
          void updateCustomerOnServer(updated);
        }
        return { ...s, customers: nextCustomers };
      });
    },
    [customerPhone, serverMenuConfigured]
  );

  const removeCustomerLocation = useCallback(
    (locationId: string) => {
      if (!customerPhone) return;
      setState((s) => ({
        ...s,
        customers: s.customers.map((c) =>
          normalizePhone(c.phone) === customerPhone
            ? {
                ...c,
                savedLocations: c.savedLocations.filter(
                  (l) => l.id !== locationId
                ),
              }
            : c
        ),
      }));
    },
    [customerPhone]
  );

  const updateCustomerName = useCallback(
    (name: string, phoneOverride?: string) => {
      const target = normalizePhone(phoneOverride || customerPhone || "");
      if (!target) return;
      setState((s) => {
        const nextCustomers = s.customers.map((c) =>
          normalizePhone(c.phone) === target
            ? { ...c, name: name.trim() || c.name }
            : c
        );
        const updated = nextCustomers.find(
          (c) => normalizePhone(c.phone) === target
        );
        if (serverMenuConfigured && updated) {
          void updateCustomerOnServer(updated);
        }
        return { ...s, customers: nextCustomers };
      });
    },
    [customerPhone, serverMenuConfigured]
  );

  const getCustomerOrders = useCallback(() => {
    if (!customerPhone) return [];
    return state.orders.filter(
      (o) => normalizePhone(o.customerPhone) === customerPhone
    );
  }, [state.orders, customerPhone]);

  const value = useMemo(
    () => ({
      ready,
      productsLoading,
      serverMenuConfigured,
      state,
      adminLoggedIn,
      customer,
      pendingOtp,
      resetDemo,
      updateConfig,
      updateProductPrice,
      replaceProductsPrices,
      upsertProduct,
      removeProduct,
      upsertPartner,
      removePartner,
      placeOrder,
      setOrderStatus,
      getOrderByTracking,
      getProduct,
      loginAdmin,
      logoutAdmin,
      requestOtp,
      verifyOtp,
      logoutCustomer,
      saveCustomerLocation,
      removeCustomerLocation,
      updateCustomerName,
      getCustomerOrders,
      syncProductsToServer,
      refreshOrdersFromServer,
      saveAdminCredentialsToServer,
    }),
    [
      ready,
      productsLoading,
      serverMenuConfigured,
      state,
      adminLoggedIn,
      customer,
      pendingOtp,
      resetDemo,
      updateConfig,
      updateProductPrice,
      replaceProductsPrices,
      upsertProduct,
      removeProduct,
      upsertPartner,
      removePartner,
      placeOrder,
      setOrderStatus,
      getOrderByTracking,
      getProduct,
      loginAdmin,
      logoutAdmin,
      requestOtp,
      verifyOtp,
      logoutCustomer,
      saveCustomerLocation,
      removeCustomerLocation,
      updateCustomerName,
      getCustomerOrders,
      syncProductsToServer,
      refreshOrdersFromServer,
      saveAdminCredentialsToServer,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
