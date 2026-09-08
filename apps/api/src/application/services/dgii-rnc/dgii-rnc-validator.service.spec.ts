import { DgiiRncValidatorService } from './dgii-rnc-validator.service';

describe('DgiiRncValidatorService', () => {
  let service: DgiiRncValidatorService;

  beforeEach(() => {
    service = new DgiiRncValidatorService();
  });

  it('should validate Dominican RNC (9 digits) checksum using Modulo 11', () => {
    const validRnc = '101007648';
    const invalidRnc = '123456789';

    expect(service.validateChecksum(validRnc)).toBe(true);
    expect(service.validateChecksum(invalidRnc)).toBe(false);
  });

  it('should validate Dominican Cedula (11 digits) checksum using Modulo 10', () => {
    const validCedula = '00112345673';
    const invalidCedula = '00112345679';

    expect(service.validateChecksum(validCedula)).toBe(true);
    expect(service.validateChecksum(invalidCedula)).toBe(false);
  });

  it('should lookup RNC and return DgiiRncLookupResult', async () => {
    const result = await service.lookupRnc('101007648');

    expect(result).toBeDefined();
    expect(result.rnc).toBe('101007648');
    expect(result.isValidChecksum).toBe(true);
    expect(result.status).toBe('ACTIVO');
    expect(result.name).toBeDefined();
  });
});
