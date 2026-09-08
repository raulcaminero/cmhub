import { DgiiNcfVerifierService } from './dgii-ncf-verifier.service';
import { NcfValidationStatus } from '@domain/enums';

describe('DgiiNcfVerifierService', () => {
  let service: DgiiNcfVerifierService;

  beforeEach(() => {
    service = new DgiiNcfVerifierService();
  });

  it('should validate physical NCF format (B0100000001)', () => {
    const validPhysical = service.validateNcfFormat('B0100000001');
    const invalidFormat = service.validateNcfFormat('XYZ12345');

    expect(validPhysical.isValid).toBe(true);
    expect(validPhysical.isElectronic).toBe(false);
    expect(validPhysical.type).toBe('B01');

    expect(invalidFormat.isValid).toBe(false);
  });

  it('should validate electronic e-NCF format (E310000000001)', () => {
    const validElectronic = service.validateNcfFormat('E310000000001');

    expect(validElectronic.isValid).toBe(true);
    expect(validElectronic.isElectronic).toBe(true);
    expect(validElectronic.type).toBe('E31');
  });

  it('should verify supplier NCF and return DgiiNcfVerificationResult', async () => {
    const result = await service.verifySupplierNcf('101007648', 'B0100000001');

    expect(result).toBeDefined();
    expect(result.providerRnc).toBe('101007648');
    expect(result.ncf).toBe('B0100000001');
    expect(result.isFormatValid).toBe(true);
    expect(result.status).toBe(NcfValidationStatus.VALID);
  });
});
