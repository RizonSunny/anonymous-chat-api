import { Pool } from 'pg';
import * as schema from './schema';
export declare const DRIZZLE_DB = "DRIZZLE_DB";
export declare const databaseProvider: {
    provide: string;
    useFactory: () => import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
        $client: Pool;
    };
};
