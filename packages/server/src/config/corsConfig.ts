import { isProduction } from 'app/config/env.js';
import type { CorsOptions } from 'cors';

const rawOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
const origin = rawOrigin.includes(',')
  ? rawOrigin.split(',').map((o) => o.trim())
  : rawOrigin;

export const corsConfig: CorsOptions = {
  origin,
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
