import { describe, expect, it } from 'vitest';
import { parseProductFile, validateProductRows } from './product-import.service';

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
});
