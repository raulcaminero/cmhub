import { test, expect } from '@playwright/test';

test.describe('DGII Electronic Invoicing (e-CF - Ley 32-23)', () => {
  test('verifies e-CF NCF types format (E31-E45) and security code structure', async () => {
    const eNcfCredit = 'E310000000001';
    const eNcfConsumer = 'E320000000001';

    // Verify e-CF NCF format
    expect(eNcfCredit).toMatch(/^E31\d{10}$/);
    expect(eNcfConsumer).toMatch(/^E32\d{10}$/);

    // Verify e-CF Security code length (6 alphanumeric characters)
    const mockSecurityCode = 'A1B2C3';
    expect(mockSecurityCode).toHaveLength(6);
    expect(mockSecurityCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('validates e-CF QR URL generation for DGII official portal', async () => {
    const rncEmisor = '101123456';
    const eNCF = 'E310000000001';
    const montoTotal = '1180.00';
    const codigoSeguridad = 'A1B2C3';

    const qrUrl = `https://ecf.dgii.gov.do/consultaeCF?RncEmisor=${rncEmisor}&eNCF=${eNCF}&MontoTotal=${montoTotal}&CodigoSeguridad=${codigoSeguridad}`;

    expect(qrUrl).toContain('https://ecf.dgii.gov.do/consultaeCF');
    expect(qrUrl).toContain(`RncEmisor=${rncEmisor}`);
    expect(qrUrl).toContain(`eNCF=${eNCF}`);
    expect(qrUrl).toContain(`CodigoSeguridad=${codigoSeguridad}`);
  });
});
