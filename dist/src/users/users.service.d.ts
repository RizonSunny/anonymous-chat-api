import { NodePgDatabase } from 'drizzle-orm/node-postgres';
type User = {
    id: string;
    username: string;
    createdAt: Date;
};
export declare class UsersService {
    private readonly db;
    constructor(db: NodePgDatabase);
    findByUsername(username: string): Promise<User | null>;
    create(username: string): Promise<User>;
    findOrCreate(username: string): Promise<User>;
}
export {};
