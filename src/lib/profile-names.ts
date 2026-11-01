/** Core::UserProfile's required, Unicode names (maximum 100 characters each). */
export function profileNameErrors(firstName: string, lastName: string): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, value, label] of [['firstName', firstName, 'given name'], ['lastName', lastName, 'father’s name']]) {
    if (!value.trim()) errors[key] = `Enter your ${label}.`;
    else if (Array.from(value.trim()).length > 100) errors[key] = 'Use no more than 100 characters.';
  }
  return errors;
}
