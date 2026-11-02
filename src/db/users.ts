import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName: string = '',
  role: string = 'CUSTOMER'
) {
  try {
    const result = await db
      .insert(users)
      .values({
        id: uid,
        email,
        fullName,
        role,
        isVerified: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          fullName: fullName || undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
