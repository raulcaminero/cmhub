import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EcfInvoiceData {
  rncEmisor: string;
  razonSocialEmisor: string;
  nombreComercialEmisor?: string;
  direccionEmisor?: string;
  rncComprador: string;
  razonSocialComprador: string;
  eNCF: string;
  tipoECF: string; // "31", "32", "33", "34", "41", "44", "45"
  fechaEmision: Date;
  formaPago: string; // "01" (Efectivo), "02" (Cheque/Transferencia), "03" (Tarjeta), etc.
  lineas: {
    nombreItem: string;
    cantidad: number;
    precioUnitario: number;
    montoItem: number;
    itbis: number;
  }[];
  totalMonto: number;
  totalITBIS: number;
}

@Injectable()
export class DgiiXmlBuilderService {
  /**
   * Genera el XML del e-CF según el estándar oficial de la DGII (v1.0)
   */
  generateEcfXml(data: EcfInvoiceData): { xml: string; securityCode: string } {
    const fechaFormatted = data.fechaEmision.toISOString().split('T')[0];
    const securityCode = this.generateSecurityCode(data.eNCF, data.totalMonto, fechaFormatted);

    const itemsXml = data.lineas
      .map(
        (item, index) => `
      <Item>
        <NumeroLinea>${index + 1}</NumeroLinea>
        <NombreItem>${this.escapeXml(item.nombreItem)}</NombreItem>
        <CantidadItem>${item.cantidad.toFixed(2)}</CantidadItem>
        <PrecioUnitarioItem>${item.precioUnitario.toFixed(2)}</PrecioUnitarioItem>
        <MontoItem>${item.montoItem.toFixed(2)}</MontoItem>
        <MontoITBIS>${item.itbis.toFixed(2)}</MontoITBIS>
      </Item>`
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ECF xmlns="http://xml.dgii.gov.do/ecf/v1.0">
  <Encabezado>
    <IdDoc>
      <TipoeCF>${data.tipoECF}</TipoeCF>
      <eNCF>${data.eNCF}</eNCF>
      <FechaEmision>${fechaFormatted}</FechaEmision>
      <FormaPago>${data.formaPago}</FormaPago>
    </IdDoc>
    <Emisor>
      <RNCEmisor>${data.rncEmisor}</RNCEmisor>
      <RazonSocialEmisor>${this.escapeXml(data.razonSocialEmisor)}</RazonSocialEmisor>
      ${data.nombreComercialEmisor ? `<NombreComercial>${this.escapeXml(data.nombreComercialEmisor)}</NombreComercial>` : ''}
      ${data.direccionEmisor ? `<DireccionEmisor>${this.escapeXml(data.direccionEmisor)}</DireccionEmisor>` : ''}
    </Emisor>
    <Comprador>
      <RNCComprador>${data.rncComprador}</RNCComprador>
      <RazonSocialComprador>${this.escapeXml(data.razonSocialComprador)}</RazonSocialComprador>
    </Comprador>
    <Totales>
      <MontoTotal>${data.totalMonto.toFixed(2)}</MontoTotal>
      <TotalITBIS>${data.totalITBIS.toFixed(2)}</TotalITBIS>
    </Totales>
    <CodigoSeguridad>${securityCode}</CodigoSeguridad>
  </Encabezado>
  <DetallesItems>${itemsXml}
  </DetallesItems>
</ECF>`.trim();

    return { xml, securityCode };
  }

  /**
   * Calcula el Código de Seguridad de 6 caracteres alfanuméricos según el HASH SHA-256
   */
  generateSecurityCode(eNCF: string, totalMonto: number, fechaEmision: string): string {
    const raw = `${eNCF}|${totalMonto.toFixed(2)}|${fechaEmision}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
    return hash.substring(0, 6);
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
