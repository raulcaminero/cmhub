import { Injectable, Logger } from '@nestjs/common';

export interface DgiiRncLookupResult {
  rnc: string;
  name: string;
  tradeName?: string;
  status: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'NO_ENCONTRADO';
  taxRegime?: string;
  isValidChecksum: boolean;
  message?: string;
}

@Injectable()
export class DgiiRncValidatorService {
  private readonly logger = new Logger(DgiiRncValidatorService.name);
  private readonly memoryCache = new Map<string, { result: DgiiRncLookupResult; expiresAt: number }>();

  /**
   * Valida la estructura matemática de un RNC (9 dígitos, Módulo 11) o Cédula (11 dígitos, Módulo 10)
   */
  validateChecksum(rnc: string): boolean {
    const clean = rnc.replace(/\D/g, '');
    if (clean.length === 9) {
      return this.validateRncModulo11(clean);
    } else if (clean.length === 11) {
      return this.validateCedulaModulo10(clean);
    }
    return false;
  }

  /**
   * Algoritmo Módulo 11 para RNC (9 dígitos)
   */
  private validateRncModulo11(rnc: string): boolean {
    const weights = [7, 9, 8, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(rnc[i], 10) * weights[i];
    }
    const remainder = sum % 11;
    let checkDigit = 0;
    if (remainder === 0) {
      checkDigit = 2;
    } else if (remainder === 1) {
      checkDigit = 1;
    } else {
      checkDigit = 11 - remainder;
    }
    return checkDigit === parseInt(rnc[8], 10);
  }

  /**
   * Algoritmo Módulo 10 para Cédula dominicana (11 dígitos)
   */
  private validateCedulaModulo10(cedula: string): boolean {
    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      let prod = parseInt(cedula[i], 10) * weights[i];
      if (prod >= 10) {
        prod = Math.floor(prod / 10) + (prod % 10);
      }
      sum += prod;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(cedula[10], 10);
  }

  /**
   * Consulta el RNC / Cédula contra el padrón público de la DGII (con caché en memoria)
   */
  async lookupRnc(rnc: string): Promise<DgiiRncLookupResult> {
    const cleanRnc = rnc.replace(/\D/g, '');
    const isValidChecksum = this.validateChecksum(cleanRnc);

    if (!isValidChecksum) {
      return {
        rnc: cleanRnc,
        name: '',
        status: 'NO_ENCONTRADO',
        isValidChecksum: false,
        message: 'El RNC o Cédula no cumple con el algoritmo de verificación dominicano.',
      };
    }

    // Verificar caché
    const cached = this.memoryCache.get(cleanRnc);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    this.logger.log(`Consultando RNC ${cleanRnc} en padrón DGII...`);

    try {
      const url = `https://dgii.gov.do/app/moc/consultas/api/consultas/rnc/${cleanRnc}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'cmhub-app/1.0' },
      });

      if (response.ok) {
        const data = await response.json();
        const result: DgiiRncLookupResult = {
          rnc: cleanRnc,
          name: data.rnc_nombre_o_razon_social || data.nombre || data.razonSocial || 'CONTRIBUYENTE REGISTRADO',
          tradeName: data.rnc_nombre_comercial || data.nombreComercial || undefined,
          status: data.rnc_estatus === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
          taxRegime: data.rnc_regimen_pagos || 'ORDINARIO',
          isValidChecksum: true,
          message: 'Contribuyente encontrado en la DGII',
        };

        // Guardar en caché por 24h
        this.memoryCache.set(cleanRnc, { result, expiresAt: Date.now() + 86400000 });
        return result;
      }
    } catch (e: any) {
      this.logger.warn(`Llamada remota a DGII falló (${e.message}). Retornando datos basados en algoritmo.`);
    }

    // Fallback cuando la red externa de la DGII no responde o desarrollo offline
    const fallbackResult: DgiiRncLookupResult = {
      rnc: cleanRnc,
      name: cleanRnc.length === 9 ? 'EMPRESA REGISTRADA DGII' : 'CONTRIBUYENTE PERSONA FISICA',
      status: 'ACTIVO',
      isValidChecksum: true,
      message: 'RNC válido según algoritmo Módulo 11/10',
    };

    this.memoryCache.set(cleanRnc, { result: fallbackResult, expiresAt: Date.now() + 3600000 });
    return fallbackResult;
  }
}
