import { Global, Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

const logger = new Logger('AppCacheModule');

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisHost = config.get<string>('REDIS_HOST');
        const redisPort = config.get<number>('REDIS_PORT') || 6379;

        if (redisHost) {
          try {
            logger.log(`Inicializando caché en Redis: redis://${redisHost}:${redisPort}`);
            const store = await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              ttl: 300 * 1000, // 5 minutos por defecto (ms)
            });
            return { store };
          } catch (err: any) {
            logger.error(`Error conectando a Redis (${redisHost}:${redisPort}): ${err.message}. Usando memoria local de fallback.`);
          }
        }

        logger.log('Redis no configurado. Usando caché en memoria local del servidor (In-Memory Fallback).');
        return {
          ttl: 300 * 1000, // 5 minutos (ms)
          max: 1000, // Máximo 1,000 respuestas en memoria
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
