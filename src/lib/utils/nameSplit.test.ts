import { describe, it, expect } from 'vitest';
import { splitFullName } from './nameSplit';

describe('splitFullName', () => {
  it('splits first and last name when full name is entered', () => {
    expect(splitFullName('Abebe Bikila')).toEqual({
      firstName: 'Abebe',
      lastName: 'Bikila',
    });
  });

  it('keeps middle names with last name', () => {
    expect(splitFullName('Haile Gebrselassie B')).toEqual({
      firstName: 'Haile',
      lastName: 'Gebrselassie B',
    });
  });

  it('handles single name by defaulting lastName to same name for backend validation', () => {
    expect(splitFullName('Aster')).toEqual({
      firstName: 'Aster',
      lastName: 'Aster',
    });
  });

  it('handles Amharic Unicode names', () => {
    expect(splitFullName('አበበ ቢቂላ')).toEqual({
      firstName: 'አበበ',
      lastName: 'ቢቂላ',
    });
  });

  it('handles empty input gracefully', () => {
    expect(splitFullName('')).toEqual({
      firstName: '',
      lastName: '',
    });
  });

  it('normalizes multiple spaces', () => {
    expect(splitFullName('  Abebe   Bikila  ')).toEqual({
      firstName: 'Abebe',
      lastName: 'Bikila',
    });
  });
});
