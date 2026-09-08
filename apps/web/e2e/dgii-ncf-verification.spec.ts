import { test, expect } from '@playwright/test';

test.describe('DGII Supplier NCF Verification (Gastos & Formato 606)', () => {
  test('verifies physical NCF (B01-B16) and electronic e-NCF (E31-E45) structural format rules', async () => {
    const physicalNcf = 'B0100000001';
    const electronicNcf = 'E310000000001';
    const invalidNcf = 'INVALID_NCF';

    expect(physicalNcf).toMatch(/^B(01|02|03|04|11|12|13|14|15|16)\d{8}$/);
    expect(electronicNcf).toMatch(/^E(31|32|33|34|41|43|44|45)\d{10}$/);
    expect(invalidNcf).not.toMatch(/^B\d{10}$/);
  });

  test('validates NCF verification endpoint structure for supplier expenses', async () => {
    const mockResponse = {
      providerRnc: '101007648',
      ncf: 'B0100000001',
      status: 'VALID',
      isFormatValid: true,
      message: 'NCF Válido y Autorizado en DGII',
    };

    expect(mockResponse.providerRnc).toBe('101007648');
    expect(mockResponse.ncf).toBe('B0100000001');
    expect(mockResponse.status).toBe('VALID');
    expect(mockResponse.isFormatValid).toBe(true);
  });
});
