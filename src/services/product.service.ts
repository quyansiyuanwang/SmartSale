import { products, persistProducts, deleteRemoteProduct, saveProduct } from './data';
import { isDemoMode } from '@/lib/supabase';
import { Product, ProductInput } from '@/types';
import { uid, nowISO } from './storage.service';

export function findProduct(id: string): Product | undefined {
  return products.value.find((p) => p.id === id);
}

export function findProductByName(keyword: string): Product | undefined {
  const kw = keyword.trim();
  if (!kw) return undefined;
  return products.value.find(
    (p) => p.name.includes(kw) || kw.includes(p.name) || p.category.includes(kw)
  );
}

export function listProducts(search = ''): Product[] {
  const s = search.trim().toLowerCase();
  if (!s) return [...products.value];
  return products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(s) ||
      p.category.toLowerCase().includes(s) ||
      p.barcode.includes(s) ||
      p.location.toLowerCase().includes(s)
  );
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const p: Product = { ...input, id: uid('p'), createdAt: nowISO(), updatedAt: nowISO() };
  if (!isDemoMode) {
    const saved = await saveProduct(p, true);
    products.value.unshift(saved);
    return saved;
  }
  products.value.unshift(p);
  await persistProducts();
  return p;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<Product | undefined> {
  const p = products.value.find((x) => x.id === id);
  if (!p) return undefined;
  Object.assign(p, patch, { updatedAt: nowISO() });
  if (isDemoMode) await persistProducts(); else await saveProduct(p);
  return p;
}

export async function deleteProduct(id: string): Promise<void> {
  products.value = products.value.filter((p) => p.id !== id);
  await deleteRemoteProduct(id);
  if (isDemoMode) await persistProducts();
}

export async function adjustStock(id: string, delta: number): Promise<Product | undefined> {
  const p = products.value.find((x) => x.id === id);
  if (!p) return undefined;
  p.stock = Math.max(0, p.stock + delta);
  p.updatedAt = nowISO();
  if (isDemoMode) await persistProducts(); else await saveProduct(p);
  return p;
}
