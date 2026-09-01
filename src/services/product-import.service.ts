import * as XLSX from 'xlsx';
import { supabase, isDemoMode } from '@/lib/supabase';
import { adjustStock, findProductByBarcode, findProductByName } from './product.service';
import { createProduct } from './product.service';
import { loadAll } from './data';
import type { ProductInput } from '@/types';

export interface ImportError { row: number; message: string; }
export interface ImportResult { imported: number; errors: ImportError[]; }
export interface StockAdjustmentInput { barcode: string; name: string; quantity: number; }
const headers: Record<string, keyof ProductInput> = { '商品名称': 'name', '条码': 'barcode', '分类': 'category', '进价': 'buyPrice', '售价': 'price', '库存': 'stock', '安全库存': 'safeStock', '货架位置': 'location', '商品描述': 'desc', name: 'name', barcode: 'barcode', category: 'category', buyPrice: 'buyPrice', price: 'price', stock: 'stock', safeStock: 'safeStock', location: 'location', desc: 'desc' };

function asText(value: unknown): string { return value == null ? '' : String(value).trim(); }
function asNumber(value: unknown, fallback = 0): number { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : fallback; }
function normalize(row: Record<string, unknown>): ProductInput { const input: Partial<ProductInput> = {}; Object.entries(row).forEach(([key, value]) => { const target = headers[key.trim()]; if (target) (input as Record<string, unknown>)[target] = value; }); return { name: asText(input.name), barcode: asText(input.barcode), category: asText(input.category), buyPrice: asNumber(input.buyPrice), price: asNumber(input.price, Number.NaN), stock: asNumber(input.stock), safeStock: asNumber(input.safeStock), location: asText(input.location), desc: asText(input.desc) }; }

export async function parseProductFile(file: File): Promise<ProductInput[]> {
  const bytes = await file.arrayBuffer();
  const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name);
  const workbook = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(bytes), { type: 'string' })
    : XLSX.read(bytes, { type: 'array' });
  const first = workbook.SheetNames[0]; if (!first) throw new Error('文件中没有可导入的工作表');
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

export function stockAdjustmentTemplate(): Blob {
  const csv = '\uFEFF条码,商品名称,补货数量\n690000000001,示例商品,20';
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

export async function parseStockAdjustmentFile(file: File): Promise<StockAdjustmentInput[]> {
  const bytes = await file.arrayBuffer();
  const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name);
  const workbook = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(bytes), { type: 'string' })
    : XLSX.read(bytes, { type: 'array' });
  const first = workbook.SheetNames[0];
  if (!first) throw new Error('文件中没有可导入的工作表');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[first], { defval: '' });
  if (!rows.length) throw new Error('文件中没有补货数据');
  if (rows.length > 1000) throw new Error('单次最多导入 1000 条补货记录');
  return rows.map((row) => {
    const barcode = asText(row['条码'] ?? row.barcode);
    const name = asText(row['商品名称'] ?? row.name);
    const rawQuantity = row['补货数量'] ?? row['数量'] ?? row.quantity;
    return { barcode, name, quantity: asNumber(rawQuantity, Number.NaN) };
  });
}

export async function importStockAdjustments(rows: StockAdjustmentInput[]): Promise<ImportResult> {
  const errors: ImportError[] = [];
  const targets = new Set<string>();
  rows.forEach((row, index) => {
    const line = index + 2;
    if (!row.barcode && !row.name) errors.push({ row: line, message: '请填写条码或商品名称' });
    if (!Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 100000) errors.push({ row: line, message: '补货数量必须是 1–100000 的整数' });
    const product = row.barcode ? findProductByBarcode(row.barcode) : findProductByName(row.name);
    if (!product && (row.barcode || row.name)) errors.push({ row: line, message: '未找到匹配的现有商品' });
    if (product && targets.has(product.id)) errors.push({ row: line, message: '同一商品在文件中重复' });
    if (product) targets.add(product.id);
  });
  if (errors.length) return { imported: 0, errors };
  for (const row of rows) {
    const product = row.barcode ? findProductByBarcode(row.barcode) : findProductByName(row.name);
    if (product) await adjustStock(product.id, row.quantity);
  }
  return { imported: rows.length, errors: [] };
}
