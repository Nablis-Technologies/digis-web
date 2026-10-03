import { describe, it, expect } from 'vitest';
import { phoneDigits, groupPhone, stripDial, toE164, formatPhoneInput } from './phone';

describe('phone', () => {
  it('extracts digits', () => {
    expect(phoneDigits('+251 91 122 3344')).toBe('251911223344');
    expect(phoneDigits('')).toBe('');
  });

  it('groups Ethiopian local numbers', () => {
    expect(groupPhone('0911223344')).toBe('09 11 223 344');
    expect(groupPhone('091')).toBe('09 1');
    expect(groupPhone('')).toBe('');
  });

  it('groups non-ET numbers generically', () => {
    expect(groupPhone('254712345678', 'KE')).toBe('254 712 3456 78');
  });

  it('strips a repeated dial code but leaves local numbers', () => {
    expect(stripDial('+251911223344', '251')).toBe('911223344');
    expect(stripDial('911223344', '251')).toBe('911223344');
  });

  it('normalises to E.164, dropping a trunk 0', () => {
    expect(toE164('0911223344', '251')).toBe('+251911223344');
    expect(toE164('+251911223344', '251')).toBe('+251911223344');
    expect(toE164('a@b.com', '251')).toBe('a@b.com');
  });

  it('formats input and preserves caret position', () => {
    expect(formatPhoneInput('0911', 4)).toEqual({ value: '09 11', caret: 5 });
    expect(formatPhoneInput('09112', 5)).toEqual({ value: '09 11 2', caret: 7 });
    expect(formatPhoneInput('', 0)).toEqual({ value: '', caret: 0 });
  });
});
