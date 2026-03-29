import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindUserByEmail = vi.fn();
const mockFindUserById = vi.fn();
const mockCreateUser = vi.fn();

vi.mock('app/repositories/auth/auth.js', () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
}));

import { registerUser, loginUser, getUserById } from './auth.service.js';

const fakeUser = {
  id: 'user-1',
  email: 'test@example.com',
  password_hash: '$2a$12$LJ3m4ys3Gzl.TY6C6UqNOeX6PDMHjDj6F5HH3F3ShXFwlC3vXKlEi', // bcrypt hash of 'password123'
  name: 'Test',
  created_at: new Date(),
  updated_at: new Date(),
};

describe('registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates user with hashed password when email is not taken', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(fakeUser);

    const result = await registerUser('test@example.com', 'password123', 'Test');

    expect(mockFindUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(mockCreateUser).toHaveBeenCalledOnce();
    // Verify the password was hashed (not stored raw)
    const hashedPassword = mockCreateUser.mock.calls[0][1];
    expect(hashedPassword).not.toBe('password123');
    expect(hashedPassword).toMatch(/^\$2[aby]\$/);
    expect(result).toEqual(fakeUser);
  });

  it('throws when email already in use', async () => {
    mockFindUserByEmail.mockResolvedValue(fakeUser);

    await expect(
      registerUser('test@example.com', 'password123'),
    ).rejects.toThrow('Email already in use');
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when user not found', async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    await expect(
      loginUser('nobody@example.com', 'password123'),
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws when password is wrong', async () => {
    // bcrypt hash of 'correctpassword'
    mockFindUserByEmail.mockResolvedValue({
      ...fakeUser,
      password_hash: '$2a$12$LJ3m4ys3Gzl.TY6C6UqNOeX6PDMHjDj6F5HH3F3ShXFwlC3vXKlEi',
    });

    await expect(
      loginUser('test@example.com', 'wrongpassword'),
    ).rejects.toThrow('Invalid email or password');
  });
});

describe('getUserById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when found', async () => {
    mockFindUserById.mockResolvedValue(fakeUser);
    const result = await getUserById('user-1');
    expect(result).toEqual(fakeUser);
    expect(mockFindUserById).toHaveBeenCalledWith('user-1');
  });

  it('returns null when not found', async () => {
    mockFindUserById.mockResolvedValue(null);
    const result = await getUserById('nonexistent');
    expect(result).toBeNull();
  });
});
