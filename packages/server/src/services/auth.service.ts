import bcrypt from "bcryptjs";
import { findUserByEmail, findUserById, createUser } from "app/repositories/auth/auth.js";
import type { User } from "app/repositories/auth/auth.js";

const SALT_ROUNDS = 12;

export async function registerUser(
    email: string,
    password: string,
    name?: string
): Promise<User> {
    const existing = await findUserByEmail(email);
    if (existing) {
        throw new Error("Email already in use");
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return createUser(email, passwordHash, name);
}

export async function loginUser(
    email: string,
    password: string
): Promise<User> {
    const user = await findUserByEmail(email);
    if (!user) {
        throw new Error("Invalid email or password");
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        throw new Error("Invalid email or password");
    }
    return user;
}

export async function getUserById(id: string): Promise<User | null> {
    return findUserById(id);
}
