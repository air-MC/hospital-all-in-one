import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ = 'Asia/Seoul';
  try {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://hospital-admin-tau.vercel.app',
        'https://air-MC.github.io',
        'https://air-mc.github.io',
        /\.github\.io$/,  // Allow any github.io subdomain
        /^https:\/\/.*\.vercel\.app$/
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization, Idempotency-Key, idempotency-key',
    });

    // Simple request logger
    app.use((req: any, res: any, next: () => void) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Application is running on: 0.0.0.0:${port}`);
    console.log(`🔗 DATABASE_URL length: ${process.env.DATABASE_URL?.length || 0}`);
    console.log('🚀 Deploy Version: 2026-01-19 v6 (Explicit Start + Debug Logs)');
  } catch (error) {
    console.error('❌ CRITICAL ERROR DURING BOOTSTRAP:', error);
    process.exit(1);
  }
}
bootstrap();
