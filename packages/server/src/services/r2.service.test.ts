import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteFile,
  downloadFile,
  getPresignedUrl,
  uploadFile,
} from './r2.service.js';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = mockSend;
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: class {
      constructor(params: Record<string, unknown>) {
        Object.assign(this, params);
      }
    },
    GetObjectCommand: class {
      constructor(params: Record<string, unknown>) {
        Object.assign(this, params);
      }
    },
    DeleteObjectCommand: class {
      constructor(params: Record<string, unknown>) {
        Object.assign(this, params);
      }
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
}));

describe('R2 service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('sends PutObjectCommand', async () => {
      mockSend.mockResolvedValue({});
      await uploadFile('key/file.pdf', Buffer.from('data'), 'application/pdf');
      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: 'key/file.pdf',
          ContentType: 'application/pdf',
        }),
      );
    });
  });

  describe('downloadFile', () => {
    it('returns buffer from S3 response', async () => {
      const bodyData = new Uint8Array([72, 101, 108, 108, 111]);
      mockSend.mockResolvedValue({
        Body: { transformToByteArray: () => Promise.resolve(bodyData) },
      });

      const result = await downloadFile('key/file.pdf');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('Hello');
    });
  });

  describe('getPresignedUrl', () => {
    it('returns a signed URL', async () => {
      const url = await getPresignedUrl('key/file.pdf');
      expect(url).toBe('https://signed-url.example.com');
    });
  });

  describe('deleteFile', () => {
    it('sends DeleteObjectCommand', async () => {
      mockSend.mockResolvedValue({});
      await deleteFile('key/file.pdf');
      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ Key: 'key/file.pdf' }),
      );
    });
  });
});
