import { storeConfig } from "@/lib/store-config";

export type CartItem = {
  productId: string;
  quantity: number;
};

export const cartChangedEvent = "lado-a-discos-cart-changed";

export function readCart(): CartItem[] {
  try {
    const rawCart = window.localStorage.getItem(storeConfig.cartStorageKey);
    if (!rawCart) return [];
    const parsed = JSON.parse(rawCart);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem);
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  window.localStorage.setItem(storeConfig.cartStorageKey, JSON.stringify(cart));
}

export function addCartItem(productId: string) {
  const currentCart = readCart();
  const nextCart = currentCart.some(item => item.productId === productId)
    ? currentCart
    : [...currentCart, { productId, quantity: 1 }];

  saveCart(nextCart);
  window.dispatchEvent(new Event(cartChangedEvent));
  return nextCart;
}

function isCartItem(candidate: unknown): candidate is CartItem {
  if (!candidate || typeof candidate !== "object") return false;
  const item = candidate as Partial<CartItem>;
  return typeof item.productId === "string" && item.productId.length > 0
    && typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0;
}
