import { query } from "app/db/pool/pool.js";

export interface User {
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    created_at: Date;
    updated_at: Date;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
    const result = await query<User>(
        "SELECT * FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0] ?? null;
}

export async function createUser(
    email: string,
    passwordHash: string,
    name?: string
): Promise<User> {
    const result = await query<User>(
        "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *",
        [email, passwordHash, name ?? null]
    );
    return result.rows[0];
}
