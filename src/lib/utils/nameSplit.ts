/**
 * Splits a full name or single name into first_name and last_name for the backend.
 *
 * Examples:
 * - "Abebe Bikila" -> { firstName: "Abebe", lastName: "Bikila" }
 * - "Aster" -> { firstName: "Aster", lastName: "Aster" } (fallback so backend presence validator passes)
 * - "Haile Gebrselassie B" -> { firstName: "Haile", lastName: "Gebrselassie B" }
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    // Single name entered: use it as first name, and fallback last name to same name
    return { firstName: trimmed, lastName: trimmed };
  }
  const firstName = trimmed.slice(0, spaceIndex).trim();
  const lastName = trimmed.slice(spaceIndex + 1).trim();
  return {
    firstName,
    lastName: lastName || firstName,
  };
}
