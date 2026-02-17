import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'agentbase',
  password: process.env.POSTGRES_PASSWORD || 'agentbase_dev',
  database: process.env.POSTGRES_DB || 'agentbase',
  entities: [join(__dirname, 'database/entities/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'database/migrations/**/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
