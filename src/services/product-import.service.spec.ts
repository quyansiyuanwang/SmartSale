import { describe, expect, it } from 'vitest';
import { parseProductFile, validateProductRows, parseStockAdjustmentFile, importStockAdjustments, stockAdjustmentTemplate } from './product-import.service';
import { loadAll, products, resetAll } from './data';

describe('商品文件导入', () => {
  it('按 UTF-8 正确解析中文 CSV 表头和商品数据', async () => {
    const csv = '商品名称,条码,分类,进价,售价,库存,安全库存,货架位置,商品描述\n电工胶带,6900000000028,五金,1,2,10,3,A3-2,绝缘防水';
    const file = {
      name: 'products.csv',
      type: 'text/csv',
      arrayBuffer: async () => new TextEncoder().encode(csv).buffer
    } as unknown as File;
    const rows = await parseProductFile(file);
    expect(rows[0]).toMatchObject({ name: '电工胶带', barcode: '6900000000028', price: 2, stock: 10, safeStock: 3, location: 'A3-2' });
    expect(validateProductRows(rows)).toEqual([]);
  });

  it('解析并执行批量补货，按条码累加现有库存', async () => {
    await resetAll();
    await loadAll();
    const target = products.value.find((product) => product.barcode === '6900000000028')!;
    const before = target.stock;
    const csv = '条码,商品名称,补货数量\n6900000000028,,17';
    const file = { name: 'restock.csv', type: 'text/csv', arrayBuffer: async () => new TextEncoder().encode(csv).buffer } as unknown as File;
    const rows = await parseStockAdjustmentFile(file);
    expect(rows[0]).toMatchObject({ barcode: '6900000000028', quantity: 17 });
    expect(await importStockAdjustments(rows)).toEqual({ imported: 1, errors: [] });
    expect(products.value.find((product) => product.id === target.id)!.stock).toBe(before + 17);
  });

  it('补货导入会在写入前报告无效数量和不存在商品', async () => {
    await loadAll();
    const result = await importStockAdjustments([
      { barcode: 'missing', name: '', quantity: 3 },
      { barcode: '6900000000028', name: '', quantity: 0 }
    ]);
    expect(result.imported).toBe(0);
    expect(result.errors.map((error) => error.message)).toEqual([
      '未找到匹配的现有商品',
      '补货数量必须是 1–100000 的整数'
    ]);
  });

  it('补货模板能够下载', () => {
    expect(stockAdjustmentTemplate().size).toBeGreaterThan(0);
  });
});
