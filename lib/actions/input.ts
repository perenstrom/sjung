function readRawString(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function readRequiredString(
  formData: FormData,
  field: string,
  errorMessage: string
): string {
  const value = readRawString(formData, field);
  if (!value) {
    throw new Error(errorMessage);
  }
  return value;
}

export function readOptionalString(formData: FormData, field: string): string | null {
  return readRawString(formData, field);
}

export function readOptionalDate(
  formData: FormData,
  field: string,
  invalidDateMessage: string
): Date | null {
  const value = readOptionalString(formData, field);
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(invalidDateMessage);
  }

  return parsed;
}

export function readGroupSlugInput(
  formData: FormData,
  errorMessage = "Saknar grupp"
): string {
  return readRequiredString(formData, "groupSlug", errorMessage);
}

export function readIdField(
  formData: FormData,
  field: string,
  errorMessage: string
): string {
  return readRequiredString(formData, field, errorMessage);
}
