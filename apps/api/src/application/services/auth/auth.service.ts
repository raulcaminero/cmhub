import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { LoginDto } from '../../dtos/auth/login.dto';
import { RegisterDto } from '../../dtos/auth/register.dto';
import { UpdateProfileDto } from '../../dtos/auth/update-profile.dto';
import { ForgotPasswordDto } from '../../dtos/auth/forgot-password.dto';
import { ResetPasswordDto } from '../../dtos/auth/reset-password.dto';
import { ChangePasswordDto } from '../../dtos/auth/change-password.dto';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { MailService } from '../../../infrastructure/mail/mail.service';

export const USER_REPOSITORY = 'USER_REPOSITORY';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new ConflictException('El correo ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
      },
    });

    const webUrl = this.config.get<string>('ALLOWED_ORIGINS')?.split(',')[0] || 'http://localhost:3000';
    const verifyLink = `${webUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    await this.mailService.sendVerificationEmail(
      user.email,
      verifyLink,
      `${user.firstName} ${user.lastName}`
    );

    return {
      message: 'Registro exitoso. Te hemos enviado un correo electrónico para verificar tu cuenta antes de ingresar.',
      email: user.email,
    };
  }

  async verifyEmail(email: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.emailVerificationToken || user.emailVerificationToken !== token) {
      throw new BadRequestException('El enlace de verificación es inválido o ha expirado.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: '¡Correo verificado exitosamente! Ya puedes iniciar sesión en CMHub.' };
  }

  async resendVerification(emailInput: string) {
    const email = emailInput.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'Si el correo está registrado, recibirás un enlace de confirmación.' };
    }

    if (user.isEmailVerified) {
      return { message: 'Esta cuenta ya está verificada. Puedes iniciar sesión.' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationToken },
    });

    const webUrl = this.config.get<string>('ALLOWED_ORIGINS')?.split(',')[0] || 'http://localhost:3000';
    const verifyLink = `${webUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    await this.mailService.sendVerificationEmail(
      user.email,
      verifyLink,
      `${user.firstName} ${user.lastName}`
    );

    return { message: 'Si el correo está registrado, recibirás un enlace de confirmación.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Require email verification unless explicitly disabled via REQUIRE_EMAIL_VERIFICATION=false
    const requireVerification = this.config.get<string>('REQUIRE_EMAIL_VERIFICATION') !== 'false';
    if (requireVerification && !user.isEmailVerified) {
      throw new UnauthorizedException('Debes verificar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada o solicita un nuevo enlace.');
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en ${minutesLeft} minuto(s).`
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      const attempts = user.failedLoginAttempts + 1;
      let lockUntil: Date | null = null;

      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        this.logger.warn(`Cuenta ${user.email} bloqueada por 15 minutos (5 intentos fallidos).`);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockUntil,
        },
      });

      throw new UnauthorizedException(
        attempts >= 5
          ? 'Has excedido el número de intentos. Cuenta bloqueada por 15 minutos.'
          : 'Credenciales inválidas'
      );
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      });
    }

    return this.generateTokens(user.id, user.email);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Anti-user enumeration: always return standard message
    if (!user) {
      return {
        message: 'Si el correo electrónico está registrado, recibirás un mensaje con las instrucciones.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    const webUrl = this.config.get<string>('ALLOWED_ORIGINS')?.split(',')[0] || 'http://localhost:3000';
    const resetLink = `${webUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await this.mailService.sendPasswordResetEmail(
      user.email,
      resetLink,
      `${user.firstName} ${user.lastName}`
    );

    return {
      message: 'Si el correo electrónico está registrado, recibirás un mensaje con las instrucciones.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      !user.passwordResetToken ||
      user.passwordResetToken !== dto.token.trim() ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado. Solicita un nuevo enlace.');
    }

    const pass = dto.newPassword;
    if (pass.length < 8 || !/[A-Z]/.test(pass) || !/[a-z]/.test(pass) || !/\d/.test(pass)) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números.');
    }

    const passwordHash = await bcrypt.hash(pass, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockUntil: null,
        isEmailVerified: true,
      },
    });

    await this.mailService.sendPasswordChangedNotice(user.email, `${user.firstName} ${user.lastName}`);

    return { message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes ingresar.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const passwordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        hashedRefreshToken: null, // Revoke all sessions on password change
      },
    });

    await this.mailService.sendPasswordChangedNotice(user.email, `${user.firstName} ${user.lastName}`);

    return { message: 'Contraseña actualizada correctamente.' };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    return { message: 'Sesión cerrada correctamente.' };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessSecret = this.config.get<string>('JWT_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
    const finalAccessSecret = accessSecret ?? (isProduction ? undefined : 'dev-jwt-secret');
    const finalRefreshSecret = refreshSecret ?? (isProduction ? undefined : 'dev-refresh-jwt-secret');

    if (!finalAccessSecret || !finalRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be configured in production');
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: finalAccessSecret,
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: finalRefreshSecret,
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    
    const { passwordHash, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;

    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.userRepository.findByEmail(dto.email);
      if (existing) throw new ConflictException('Email already in use');
      updateData.email = dto.email;
    }

    if (dto.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updatedUser = await this.userRepository.update(userId, updateData);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }

  async refresh(refreshToken: string) {
    try {
      const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-jwt-secret';
      const payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
      
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
      if (!refreshTokenMatches) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      return this.generateTokens(user.id, user.email);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
