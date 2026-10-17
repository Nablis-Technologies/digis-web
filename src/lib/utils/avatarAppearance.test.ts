import { describe, it, expect } from 'vitest';
import { placeholderSurface, placeholderInk, initialsOf, avatarRing } from './avatarAppearance';

describe('avatar placeholder surfaces', () => {
  it("wears the app's own dark/light surface — never an invented hue", () => {
    expect(placeholderSurface(true)).toBe('rgba(255,255,255,0.06)');
    expect(placeholderSurface(false)).toBe('rgba(0,0,0,0.05)');
  });

  it('inks the initials to stay legible on that surface', () => {
    expect(placeholderInk(true)).toBe('rgba(255,255,255,0.92)');
    expect(placeholderInk(false)).toBe('rgba(0,0,0,0.75)');
  });
});

describe('initialsOf', () => {
  it('takes up to two initials from a name', () => {
    expect(initialsOf('The Venue Warehouse')).toBe('TV');
    expect(initialsOf('Rophnan')).toBe('R');
    expect(initialsOf('')).toBe('');
  });
});

describe('avatarRing', () => {
  it('returns a quiet theme halo, not a painted border', () => {
    expect(avatarRing(true)).toContain('rgba(255,255,255,0.08)');
    expect(avatarRing(false)).toContain('rgba(20,18,31,0.06)');
  });
});
