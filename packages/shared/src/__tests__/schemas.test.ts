import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  userSchema,
  settingsSchema,
  quotaSchema,
  audioRequestSchema,
  audioResponseSchema,
  cleanupRequestSchema,
  isAudioWithinLimit,
} from '../schemas';

describe('Shared Zod Schemas Validation', () => {
  describe('loginSchema', () => {
    it('should validate standard email and password', () => {
      const valid = { email: 'user@example.com', password: 'securepassword123' };
      const parsed = loginSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject invalid emails', () => {
      const invalid = { email: 'not-an-email', password: 'securepassword123' };
      const parsed = loginSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const invalid = { email: 'user@example.com', password: 'short' };
      const parsed = loginSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate optional names alongside valid credentials', () => {
      const valid = { email: 'user@example.com', password: 'securepassword123', name: 'John Doe' };
      const parsed = registerSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });

  describe('userSchema', () => {
    it('should validate exact UUID format for user id', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        name: 'Bob',
        plan: 'free',
      };
      const parsed = userSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject non-UUID user ids', () => {
      const invalid = {
        id: '12345',
        email: 'user@example.com',
        name: 'Bob',
        plan: 'free',
      };
      const parsed = userSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should reject unsupported plan tiers', () => {
      const invalid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        name: 'Bob',
        plan: 'enterprise',
      };
      const parsed = userSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('settingsSchema', () => {
    it('should validate standard language and model settings', () => {
      const valid = {
        language: 'ar',
        preferredModel: 'gemini-flash',
        autoCleanup: true,
        requireConfirmation: false,
      };
      const parsed = settingsSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject unsupported settings values', () => {
      const invalid = {
        language: 'french',
        preferredModel: 'gpt-4',
        autoCleanup: true,
        requireConfirmation: false,
      };
      const parsed = settingsSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('quotaSchema', () => {
    it('should validate nonnegative quota tracking values', () => {
      const valid = {
        secondsUsed: 0,
        remainingSeconds: 1800,
        plan: 'pro',
      };
      const parsed = quotaSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject negative numbers in quota tracking', () => {
      const invalid = {
        secondsUsed: -10,
        remainingSeconds: 100,
        plan: 'free',
      };
      const parsed = quotaSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('audioRequestSchema', () => {
    it('should validate valid durationSeconds within limits', () => {
      const valid = {
        durationSeconds: 120,
        language: 'en',
      };
      const parsed = audioRequestSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject negative durationSeconds', () => {
      const invalid = {
        durationSeconds: -50,
      };
      const parsed = audioRequestSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should reject zero durationSeconds since it requires a positive number', () => {
      const invalid = {
        durationSeconds: 0,
      };
      const parsed = audioRequestSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should reject durationSeconds exceeding maximum limit of 1 hour', () => {
      const invalid = {
        durationSeconds: 3601, // 1 hour + 1 second
      };
      const parsed = audioRequestSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('audioResponseSchema', () => {
    it('should validate structured response returned from transcription endpoint', () => {
      const valid = {
        transcript: 'This is a transcription',
        provider: 'groq',
        durationSeconds: 5.5,
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const parsed = audioResponseSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject invalid STT providers or non-UUID requestId', () => {
      const invalid = {
        transcript: 'Incorrect response',
        provider: 'openai',
        durationSeconds: 5.5,
        requestId: 'not-a-uuid',
      };
      const parsed = audioResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('cleanupRequestSchema', () => {
    it('should validate correct cleanup inputs', () => {
      const valid = {
        transcript: 'Clean me please',
        cleanupMode: 'formal',
        websiteContext: 'https://mysite.com',
      };
      const parsed = cleanupRequestSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject empty transcript', () => {
      const invalid = {
        transcript: '',
        cleanupMode: 'light',
      };
      const parsed = cleanupRequestSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('isAudioWithinLimit helper', () => {
    it('should accept valid sizes within limit (25 MB)', () => {
      expect(isAudioWithinLimit(10 * 1024 * 1024)).toBe(true); // 10MB
      expect(isAudioWithinLimit(25 * 1024 * 1024)).toBe(true); // 25MB (Max)
    });

    it('should reject sizes larger than limit', () => {
      expect(isAudioWithinLimit(26 * 1024 * 1024)).toBe(false); // 26MB
    });

    it('should reject negative or zero sizes', () => {
      expect(isAudioWithinLimit(0)).toBe(false);
      expect(isAudioWithinLimit(-5)).toBe(false);
    });
  });
});
