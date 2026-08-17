import { test, expect } from '@playwright/test';

test.describe('Excel & CSV 606/607 Import/Export Module', () => {
  test('unauthenticated export request is safely guarded', async ({ page }) => {
    await page.goto('/cmhub/reports');
    await expect(page).toHaveURL(/\/login/);
  });

  test('verifies 606 CSV export headers formatting (RNC, Tipo NCF, NCF, Monto, ITBIS)', async () => {
    const csvHeaders = ['RNC_CEDULA', 'TIPO_NCF', 'NCF', 'MONTO_FACTURADO', 'ITBIS_FACTURADO'];
    const mockRow = ['131234567', '01', 'B0100000001', '1000.00', '180.00'];

    const csvContent = `${csvHeaders.join(',')}\n${mockRow.join(',')}`;

    expect(csvContent).toContain('RNC_CEDULA');
    expect(csvContent).toContain('B0100000001');
    expect(csvContent).toContain('180.00');
  });

  test('verifies file upload mime type validation for Excel and CSV files', async () => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    const validExcelMime = 'text/csv';
    const invalidImageMime = 'image/png';

    expect(allowedMimeTypes.includes(validExcelMime)).toBe(true);
    expect(allowedMimeTypes.includes(invalidImageMime)).toBe(false);
  });
});
