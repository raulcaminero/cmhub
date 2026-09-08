import { DgiiXmlBuilderService, EcfInvoiceData } from './dgii-xml-builder.service';

describe('DgiiXmlBuilderService', () => {
  let service: DgiiXmlBuilderService;

  beforeEach(() => {
    service = new DgiiXmlBuilderService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate valid e-CF XML structure according to DGII v1.0 specifications', () => {
    const mockData: EcfInvoiceData = {
      rncEmisor: '101123456',
      razonSocialEmisor: 'Empresa Test SRL',
      rncComprador: '130987654',
      razonSocialComprador: 'Cliente Test SAS',
      eNCF: 'E310000000001',
      tipoECF: '31',
      fechaEmision: new Date('2026-09-07'),
      formaPago: '02',
      lineas: [
        {
          nombreItem: 'Servicios de Consultoria',
          cantidad: 1,
          precioUnitario: 1000.0,
          montoItem: 1000.0,
          itbis: 180.0,
        },
      ],
      totalMonto: 1180.0,
      totalITBIS: 180.0,
    };

    const { xml, securityCode } = service.generateEcfXml(mockData);

    expect(xml).toContain('<TipoeCF>31</TipoeCF>');
    expect(xml).toContain('<eNCF>E310000000001</eNCF>');
    expect(xml).toContain('<RNCEmisor>101123456</RNCEmisor>');
    expect(xml).toContain('<RNCComprador>130987654</RNCComprador>');
    expect(xml).toContain('<MontoTotal>1180.00</MontoTotal>');
    expect(xml).toContain('<TotalITBIS>180.00</TotalITBIS>');
    expect(securityCode).toBeDefined();
    expect(securityCode.length).toBe(6);
  });

  it('should generate consistent security code based on SHA-256 hash', () => {
    const eNCF = 'E310000000001';
    const totalMonto = 1180.0;
    const fecha = '2026-09-07';

    const code1 = service.generateSecurityCode(eNCF, totalMonto, fecha);
    const code2 = service.generateSecurityCode(eNCF, totalMonto, fecha);

    expect(code1).toBe(code2);
    expect(code1).toMatch(/^[A-Z0-9]{6}$/);
  });
});
