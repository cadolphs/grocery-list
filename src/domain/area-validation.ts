// Area Name Validation - pure domain function
// No IO imports

const MAX_AREA_NAME_LENGTH = 40;

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly error: string };

const isDuplicateArea = (name: string, existingNames: string[]): boolean =>
  existingNames.some(existing => existing.toLowerCase() === name.toLowerCase());

export const validateAreaName = (
  name: string,
  existingNames: string[],
): ValidationResult => {
  const trimmedName = name.trim();

  if (trimmedName === '') {
    return { valid: false, error: 'Area name is required' };
  }

  if (trimmedName.length > MAX_AREA_NAME_LENGTH) {
    return { valid: false, error: `Area name must be at most ${MAX_AREA_NAME_LENGTH} characters` };
  }

  if (isDuplicateArea(trimmedName, existingNames)) {
    return { valid: false, error: `"${trimmedName}" already exists` };
  }

  return { valid: true };
};
