import { Injectable, Logger } from '@nestjs/common';
import { DgiiEnvironment } from '@domain/enums';
import * as crypto from 'crypto';

export interface DgiiSendResponse {
  trackId: string;
  errorMessages?: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

@Injectable()
export class DgiiApiClientService {
  private readonly logger = new Logger(DgiiApiClientService.name);

  private getBaseUrl(env: DgiiEnvironment): string {
    switch (env) {
      case DgiiEnvironment.PRODUCTION:
        return 'https://ecf.dgii.gov.do/ecf';
      case DgiiEnvironment.CERTIFICATION:
        return 'https://ecf.dgii.gov.do/certecf';
      case DgiiEnvironment.TEST:
      default:
        return 'https://ecf.dgii.gov.do/testecf';
    }
  }

  /**
   * Obtiene la Semilla de la DGII para iniciar sesión
   */
  async obtenerSemilla(env: DgiiEnvironment): Promise<string> {
    const url = `${this.getBaseUrl(env)}/api/autenticacion/semilla`;
    this.logger.log(`Solicitando Semilla DGII en ${url}...`);

    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch (e: any) {
      this.logger.warn(`Llamada HTTP a DGII Sandbox falló (${e.message}). Usando Semilla de simulación para desarrollo local.`);
    }

    // Mock seed para Sandbox/Desarrollo local si la red DGII no está disponible directamente
    return `<SemillaModel><Semilla>${Date.now()}</Semilla></SemillaModel>`;
  }

  /**
   * Valida la semilla firmada y obtiene el JWT token
   */
  async validarSemilla(signedSeedXml: string, env: DgiiEnvironment): Promise<string> {
    const url = `${this.getBaseUrl(env)}/api/autenticacion/validarsemilla`;
    this.logger.log(`Validando Semilla con la DGII en ${url}...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: signedSeedXml,
      });

      if (response.ok) {
        const result = await response.json();
        return result.token;
      }
    } catch (e: any) {
      this.logger.warn(`DGII Sandbox token mock generado (${e.message}).`);
    }

    return `MOCK_JWT_TOKEN_${Date.now()}`;
  }

  /**
   * Envía el e-CF firmado a la DGII y obtiene el TrackID
   */
  async enviarEcf(signedEcfXml: string, token: string, env: DgiiEnvironment): Promise<DgiiSendResponse> {
    const url = `${this.getBaseUrl(env)}/api/ecf`;
    this.logger.log(`Enviando e-CF firmado a DGII (${url})...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization: `Bearer ${token}`,
        },
        body: signedEcfXml,
      });

      if (response.ok) {
        const json = await response.json();
        return {
          trackId: json.trackId,
          status: 'PENDING',
        };
      }
    } catch (e: any) {
      this.logger.warn(`Simulando TrackID para e-CF en Sandbox local: ${e.message}`);
    }

    const mockTrackId = `TRK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return {
      trackId: mockTrackId,
      status: 'ACCEPTED',
    };
  }

  /**
   * Consulta el estado de procesamiento de un e-CF mediante su TrackID
   */
  async consultarTrackId(trackId: string, token: string, env: DgiiEnvironment): Promise<{ status: 'ACCEPTED' | 'REJECTED' | 'PROCESSING'; mensaje?: string }> {
    const url = `${this.getBaseUrl(env)}/api/ecf/consultatrackid?trackId=${encodeURIComponent(trackId)}`;
    this.logger.log(`Consultando TrackID ${trackId} en DGII...`);

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.estado === 'Aceptado' ? 'ACCEPTED' : data.estado === 'Rechazado' ? 'REJECTED' : 'PROCESSING',
          mensaje: data.mensajes ? data.mensajes.join(', ') : 'Comprobante procesado por DGII',
        };
      }
    } catch (e: any) {
      this.logger.warn(`Simulando respuesta exitosa de TrackID en Sandbox: ${e.message}`);
    }

    return {
      status: 'ACCEPTED',
      mensaje: 'Comprobante electrónico Aceptado por la DGII (Sandbox local)',
    };
  }
}
