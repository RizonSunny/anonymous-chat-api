import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { customAlphabet } from 'nanoid';
import { users } from '../database/schema/users.schema';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

type User = { id: string; username: string; createdAt: Date };

@Injectable()
export class UsersService {
  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user ?? null;
  }

  async create(username: string): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({ id: `usr_${nanoid()}`, username })
      .returning();
    return user;
  }

  async findOrCreate(username: string): Promise<User> {
    const existing = await this.findByUsername(username);
    return existing ?? this.create(username);
  }
}
