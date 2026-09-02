export const storeConfig = {
  name: "LADO A DISCOS",
  whatsappNumber: "",
  instagramHandle: "",
  defaultCity: "Buenos Aires",
  cartStorageKey: "lado-a-discos-cart",
  inventoryStorageKey: "lado-a-discos-inventory-status",
  productOverridesStorageKey: "lado-a-discos-product-overrides",
  adminStorageKey: "lado-a-discos-admin-session"
};

export function buildWhatsAppUrl(message: string) {
  const encodedMessage = encodeURIComponent(message);

  if (!storeConfig.whatsappNumber) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${storeConfig.whatsappNumber}?text=${encodedMessage}`;
}
