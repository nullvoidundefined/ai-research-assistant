import { isProduction } from 'app/config/env.js';
import type { CorsOptions } from 'cors';

export const corsConfig: CorsOptions = {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export const corsDevConfig: CorsOptions = isProduction
  ? corsConfig
  : {
      ...corsConfig,
      origin: true,
    };
