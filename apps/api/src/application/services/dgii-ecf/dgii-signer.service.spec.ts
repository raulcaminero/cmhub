import { DgiiSignerService } from './dgii-signer.service';

describe('DgiiSignerService', () => {
  let service: DgiiSignerService;

  beforeEach(() => {
    service = new DgiiSignerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should apply XAdES signature block to XML in test mode', async () => {
    const rawXml = '<ECF><Encabezado><eNCF>E310000000001</eNCF></Encabezado></ECF>';

    const signedXml = await service.signXml(rawXml);

    expect(signedXml).toContain('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"');
    expect(signedXml).toContain('<SignatureValue>');
    expect(signedXml).toContain('</ECF>');
  });
});
