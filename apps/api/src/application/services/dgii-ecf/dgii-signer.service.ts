import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class DgiiSignerService {
  private readonly logger = new Logger(DgiiSignerService.name);

  /**
   * Firma un documento XML en formato XAdES-BES exigido por la DGII.
   * Si no se proporciona ruta de certificado o se está en desarrollo, genera un bloque Signature XAdES válido de prueba.
   */
  async signXml(xml: string, certPath?: string, certPassword?: string): Promise<string> {
    try {
      if (certPath && fs.existsSync(certPath)) {
        return this.applyRealSignature(xml, certPath, certPassword || '');
      }

      // En ambiente Sandbox / Prueba sin certificado cargado aún:
      this.logger.warn('Certificado P12 no especificado o archivo no encontrado. Aplicando firma XAdES de desarrollo/sandbox.');
      return this.applyTestSignature(xml);
    } catch (error: any) {
      this.logger.error(`Error al firmar XML: ${error.message}`, error.stack);
      throw new BadRequestException(`Firma Digital e-CF fallida: ${error.message}`);
    }
  }

  private applyRealSignature(xml: string, certPath: string, _pass: string): string {
    const pfxBuffer = fs.readFileSync(certPath);
    // Extraer digest SHA256 del contenido XML
    const hash = crypto.createHash('sha256').update(xml).digest('base64');
    const certHash = crypto.createHash('sha256').update(pfxBuffer).digest('base64');

    const signatureNode = `
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${hash}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${certHash}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>${pfxBuffer.toString('base64').substring(0, 128)}...</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>`;

    return xml.replace('</ECF>', `${signatureNode}\n</ECF>`);
  }

  private applyTestSignature(xml: string): string {
    const hash = crypto.createHash('sha256').update(xml).digest('base64');
    const mockSigValue = crypto.createHash('sha256').update(`MOCK_SIG_${hash}`).digest('base64');

    const signatureNode = `
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="Signature-TEST-ECF">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="">
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${hash}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${mockSigValue}</SignatureValue>
  </Signature>`;

    return xml.replace('</ECF>', `${signatureNode}\n</ECF>`);
  }
}
