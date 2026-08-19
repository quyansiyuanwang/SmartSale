import * as XLSX from 'xlsx';
import { supabase, isDemoMode } from '@/lib/supabase';
import { createProduct } from './product.service';
import { loadAll } from './data';
import type { ProductInput } from '@/types';

export interface ImportError { row: number; message: string; }
export interface ImportResult { imported: number; errors: ImportError[]; }
const headers: Record<string, keyof ProductInput> = { '商品名称': 'name', '条码': 'barcode', '分类': 'category', '进价': 'buyPrice', '售价': 'price', '库存': 'stock', '安全库存': 'safeStock', '货架位置': 'location', '商品描述': 'desc', name: 'name', barcode: 'barcode', category: 'category', buyPrice: 'buyPrice', price: 'price', stock: 'stock', safeStock: 'safeStock', location: 'location', desc: 'desc' };

function asText(value: unknown): string { return value == null ? '' : String(value).trim(); }
function asNumber(value: unknown, fallback = 0): number { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : fallback; }
function normalize(row: Record<string, unknown>): ProductInput { const input: Partial<ProductInput> = {}; Object.entries(row).forEach(([key, value]) => { const target = headers[key.trim()]; if (target) (input as Record<string, unknown>)[target] = value; }); return { name: asText(input.name), barcode: asText(input.barcode), category: asText(input.category), buyPrice: asNumber(input.buyPrice), price: asNumber(input.price, Number.NaN), stock: asNumber(input.stock), safeStock: asNumber(input.safeStock), location: asText(input.location), desc: asText(input.desc) }; }

export async function parseProductFile(file: File): Promise<ProductInput[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const first = workbook.SheetNames[0]; if (!first) throw new Error('文件中没有可导入的工作表');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[first], { defval: '' }); if (!rows.length) throw new Error('文件中没有商品数据'); if (rows.length > 1000) throw new Error('单次最多导入 1000 个商品'); return rows.map(normalize);
}

export function validateProductRows(rows: ProductInput[]): ImportError[] {
  const errors: ImportError[] = []; const barcodes = new Set<string>(); rows.forEach((row, index) => { const line = index + 2; if (!row.name) errors.push({ row: line, message: '商品名称不能为空' }); if (!Number.isFinite(row.price) || row.price < 0) errors.push({ row: line, message: '售价必须是大于等于 0 的数字' }); if (row.buyPrice < 0 || row.stock < 0 || row.safeStock < 0 || !Number.isInteger(row.stock) || !Number.isInteger(row.safeStock)) errors.push({ row: line, message: '进价不能为负数，库存必须为非负整数' }); if (row.barcode && barcodes.has(row.barcode)) errors.push({ row: line, message: '文件内条码重复' }); barcodes.add(row.barcode); }); return errors;
}

export async function importProducts(rows: ProductInput[]): Promise<ImportResult> {
  const errors = validateProductRows(rows); if (errors.length) return { imported: 0, errors };
  if (isDemoMode) { for (const row of rows) await createProduct(row); return { imported: rows.length, errors: [] }; }
  if (!supabase) throw new Error('平台服务尚未配置'); const { data, error } = await supabase.functions.invoke('import-products', { body: { products: rows } }); if (error) throw error;
  if (data?.errors?.length) return { imported: 0, errors: data.errors }; await loadAll(); return { imported: data?.imported ?? 0, errors: [] };
}

export function productTemplate(): Blob {
  const csv = '\uFEFF商品名称,条码,分类,进价,售价,库存,安全库存,货架位置,商品描述\n示例商品,690000000001,五金,5,9.9,20,5,A1-01,用途和使用说明';
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}
