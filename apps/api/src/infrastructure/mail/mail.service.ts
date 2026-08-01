import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resendClient: Resend | null = null;
  private nodemailerTransporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    if (resendKey) {
      this.resendClient = new Resend(resendKey);
      this.logger.log('MailService: Configurado con proveedor Resend API.');
    } else {
      const host = this.config.get<string>('SMTP_HOST');
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');
      const port = this.config.get<number>('SMTP_PORT') || 587;

      if (host && user && pass) {
        this.nodemailerTransporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log(`MailService: Configurado con servidor SMTP (${host}:${port}).`);
      } else {
        this.logger.warn('MailService: Sin credenciales SMTP/Resend. Modo desarrollo activado (los enlaces de restablecimiento se imprimirán en consola).');
      }
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string, userName: string): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM') || 'CMHub Security <no-reply@cmhub.do>';
    const subject = '🔒 Restablecer tu contraseña en CMHub';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Restablece tu contraseña</h2>
        <p style="color: #334155; font-size: 14px;">Hola <strong>${userName}</strong>,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>CMHub</strong>.
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; font-weight: bold; border-radius: 6px; text-decoration: none; display: inline-block; font-size: 14px;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.4;">
          Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:<br />
          <a href="${resetLink}" style="color: #4f46e5;">${resetLink}</a>
        </p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          Este enlace expirará en 1 hora por razones de seguridad. Si no solicitaste este cambio, puedes ignorar este mensaje.
        </p>
      </div>
    `;

    try {
      if (this.resendClient) {
        await this.resendClient.emails.send({
          from,
          to: [email],
          subject,
          html: htmlContent,
        });
        this.logger.log(`Correo de recuperación enviado a ${email} vía Resend.`);
        return true;
      }

      if (this.nodemailerTransporter) {
        await this.nodemailerTransporter.sendMail({
          from,
          to: email,
          subject,
          html: htmlContent,
        });
        this.logger.log(`Correo de recuperación enviado a ${email} vía SMTP.`);
        return true;
      }

      // Dev Fallback
      this.logger.warn(`
================================================================================
📧 [DEV MAIL FALLBACK] RESTABLECER CONTRASEÑA
Para: ${email} (${userName})
Enlace de recuperación:
${resetLink}
================================================================================
      `);
      return true;
    } catch (err: any) {
      this.logger.error(`Error al enviar correo de restablecimiento a ${email}: ${err.message}`);
      return false;
    }
  }

  async sendPasswordChangedNotice(email: string, userName: string): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM') || 'CMHub Security <no-reply@cmhub.do>';
    const subject = '⚠️ Tu contraseña de CMHub ha sido actualizada';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Contraseña Actualizada</h2>
        <p style="color: #334155; font-size: 14px;">Hola <strong>${userName}</strong>,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          Te notificamos que la contraseña de tu cuenta en <strong>CMHub</strong> fue cambiada exitosamente.
        </p>
        <p style="color: #dc2626; font-size: 13px; font-weight: bold; margin-top: 16px;">
          Si tú no realizaste este cambio, por favor contacta al administrador de tu empresa inmediatamente.
        </p>
      </div>
    `;

    try {
      if (this.resendClient) {
        await this.resendClient.emails.send({ from, to: [email], subject, html: htmlContent });
      } else if (this.nodemailerTransporter) {
        await this.nodemailerTransporter.sendMail({ from, to: email, subject, html: htmlContent });
      } else {
        this.logger.log(`[DEV MAIL] Notificación de clave actualizada enviada a ${email}`);
      }
      return true;
    } catch (err: any) {
      this.logger.error(`Error enviando notificación de clave a ${email}: ${err.message}`);
      return false;
    }
  }

  async sendVerificationEmail(email: string, verifyLink: string, userName: string): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM') || 'CMHub Security <no-reply@cmhub.do>';
    const subject = '✉️ Confirma tu correo electrónico en CMHub';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Bienvenido a CMHub</h2>
        <p style="color: #334155; font-size: 14px;">Hola <strong>${userName}</strong>,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          Gracias por registrarte en <strong>CMHub</strong>. Para comenzar a utilizar tu cuenta, por favor confirma tu dirección de correo electrónico haciendo clic en el siguiente botón:
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; font-weight: bold; border-radius: 6px; text-decoration: none; display: inline-block; font-size: 14px;">
            Confirmar mi Correo
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.4;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
          <a href="${verifyLink}" style="color: #4f46e5;">${verifyLink}</a>
        </p>
      </div>
    `;

    try {
      if (this.resendClient) {
        await this.resendClient.emails.send({ from, to: [email], subject, html: htmlContent });
        this.logger.log(`Correo de verificación enviado a ${email} vía Resend.`);
      } else if (this.nodemailerTransporter) {
        await this.nodemailerTransporter.sendMail({ from, to: email, subject, html: htmlContent });
        this.logger.log(`Correo de verificación enviado a ${email} vía SMTP.`);
      } else {
        this.logger.warn(`
================================================================================
📧 [DEV MAIL FALLBACK] VERIFICACIÓN DE CORREO
Para: ${email} (${userName})
Enlace de verificación:
${verifyLink}
================================================================================
        `);
      }
      return true;
    } catch (err: any) {
      this.logger.error(`Error enviando correo de verificación a ${email}: ${err.message}`);
      return false;
    }
  }
}
