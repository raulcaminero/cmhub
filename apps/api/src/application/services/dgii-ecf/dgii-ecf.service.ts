import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { DgiiXmlBuilderService } from './dgii-xml-builder.service';
import { DgiiSignerService } from './dgii-signer.service';
import { DgiiApiClientService } from './dgii-api-client.service';
import { EcfStatus, DgiiEnvironment } from '@domain/enums';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class DgiiEcfService {
  private readonly logger = new Logger(DgiiEcfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlBuilder: DgiiXmlBuilderService,
    private readonly signer: DgiiSignerService,
    private readonly apiClient: DgiiApiClientService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Transmite una factura electrónica a la DGII
   */
  async processEcfForInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { company: true, lines: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    if (!invoice.ncfType.startsWith('E')) {
      this.logger.log(`La factura ${invoice.ncf} es NCF físico (${invoice.ncfType}). Omitiendo flujo e-CF.`);
      return invoice;
    }

    this.logger.log(`Iniciando procesamiento e-CF para factura ${invoice.ncf} (${invoice.company.name})...`);

    // 1. Construir datos y XML
    const tipoECF = invoice.ncfType.substring(1); // ej "31" para E31
    const { xml, securityCode } = this.xmlBuilder.generateEcfXml({
      rncEmisor: invoice.company.rnc,
      razonSocialEmisor: invoice.company.name,
      nombreComercialEmisor: invoice.company.tradeName || undefined,
      direccionEmisor: invoice.company.address || undefined,
      rncComprador: invoice.clientRnc,
      razonSocialComprador: invoice.clientName,
      eNCF: invoice.ncf,
      tipoECF,
      fechaEmision: invoice.date,
      formaPago: '02',
      lineas: invoice.lines.map((l) => ({
        nombreItem: l.description,
        cantidad: Number(l.quantity),
        precioUnitario: Number(l.unitPrice),
        montoItem: Number(l.subtotal),
        itbis: Number(l.itbis),
      })),
      totalMonto: Number(invoice.amount),
      totalITBIS: Number(invoice.itbis),
    });

    // 2. Firmar XML
    const signedXml = await this.signer.signXml(
      xml,
      invoice.company.digitalCertPath || undefined,
      invoice.company.digitalCertPasswordEncrypted || undefined
    );

    // 3. Autenticación con la DGII (Semilla -> Token)
    const env = (invoice.company.dgiiEnvironment as DgiiEnvironment) || DgiiEnvironment.TEST;
    const semillaXml = await this.apiClient.obtenerSemilla(env);
    const signedSemilla = await this.signer.signXml(
      semillaXml,
      invoice.company.digitalCertPath || undefined,
      invoice.company.digitalCertPasswordEncrypted || undefined
    );
    const token = await this.apiClient.validarSemilla(signedSemilla, env);

    // 4. Enviar e-CF a la DGII
    const sendResponse = await this.apiClient.enviarEcf(signedXml, token, env);

    // 5. Armar URL del Código QR oficial DGII
    const qrUrl = `https://ecf.dgii.gov.do/consultaeCF?RncEmisor=${invoice.company.rnc}&eNCF=${invoice.ncf}&MontoTotal=${Number(invoice.amount).toFixed(2)}&CodigoSeguridad=${securityCode}`;

    // 6. Actualizar la Factura en la Base de Datos
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ecfStatus: sendResponse.status === 'ACCEPTED' ? EcfStatus.ACCEPTED : EcfStatus.PENDING_SEND,
        ecfSecurityCode: securityCode,
        ecfTrackId: sendResponse.trackId,
        ecfSignedXml: signedXml,
        ecfQrUrl: qrUrl,
        ecfApprovedAt: sendResponse.status === 'ACCEPTED' ? new Date() : null,
        ecfResponseMsg: sendResponse.status === 'ACCEPTED' ? 'Comprobante Aceptado por la DGII' : 'Transmisión registrada con TrackID',
      },
    });

    await this.auditLogService.logAction({
      companyId: invoice.companyId,
      action: 'DGII_ECF_TRANSMIT',
      entity: 'Invoice',
      entityId: invoice.id,
      details: { ncf: invoice.ncf, trackId: sendResponse.trackId, status: updatedInvoice.ecfStatus },
    });

    return updatedInvoice;
  }

  /**
   * Consulta el estado de un e-CF pendiente por su TrackID
   */
  async checkEcfStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { company: true },
    });

    if (!invoice || !invoice.ecfTrackId) {
      throw new NotFoundException(`La factura no posee un TrackID registrado.`);
    }

    const env = (invoice.company.dgiiEnvironment as DgiiEnvironment) || DgiiEnvironment.TEST;
    const result = await this.apiClient.consultarTrackId(invoice.ecfTrackId, 'MOCK_TOKEN', env);

    const newStatus = result.status === 'ACCEPTED' ? EcfStatus.ACCEPTED : result.status === 'REJECTED' ? EcfStatus.REJECTED : EcfStatus.PROCESSING;

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ecfStatus: newStatus,
        ecfResponseMsg: result.mensaje,
        ecfApprovedAt: newStatus === EcfStatus.ACCEPTED ? new Date() : invoice.ecfApprovedAt,
      },
    });
  }
}
