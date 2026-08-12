export const PRODUCT_IMAGE_FALLBACKS: Record<string, string[]> = {
  'beam-wallet-nfc': [
    '/images/Beam_Wallet_NFC_1.jpg',
    '/images/Beam_Wallet_NFC_2.jpg',
  ],
  'bluetooth-terminal-physical-stores': [
    '/images/Bluetooth_terminal_for_physical_stores_1.jpg',
    '/images/Bluetooth_terminal_for_physical_stores_2.jpg',
    '/images/Bluetooth_terminal_for_physical_stores_3.jpg',
  ],
  'beam-wallet-for-online-stores': [
    '/images/Beam_Wallet_for_Online_Stores_1.jpg',
    '/images/Beam_Wallet_for_Online_Stores_2.png',
    '/images/Beam_Wallet_for_Online_Stores_3.png',
  ],
  'quality-and-confidence-certificate': [
    '/images/Quality_and_Confidence_Certificate_1.jpg',
    '/images/Quality_and_Confidence_Certificate_2.jpg',
  ],
};

export function getProductImages(product: {
  slug: string;
  images?: string[];
  imageUrl?: string | null;
}): string[] {
  if (product.images && product.images.length > 0) return product.images;
  if (PRODUCT_IMAGE_FALLBACKS[product.slug]) return PRODUCT_IMAGE_FALLBACKS[product.slug];
  if (product.imageUrl) return [product.imageUrl];
  return [];
}
