import { describe, it, expect } from 'vitest';
import { validateEmail, validatePasswordStrength } from './validation';

describe('Validation Utils', () => {
    it('should validate correct email addresses', () => {
        expect(validateEmail('test@test.com')).toBe(true);
        expect(validateEmail('invalid-email')).toBe(false);
    });

    it('should validate password strength', () => {
        expect(validatePasswordStrength('weak').isValid).toBe(false); // Too short
        expect(validatePasswordStrength('JustLetters').isValid).toBe(false); // Missing number
        expect(validatePasswordStrength('StrongPass1!').isValid).toBe(true);
    });
});
