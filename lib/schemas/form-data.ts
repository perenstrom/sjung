/** A submitted form field as a string; empty when it is missing or a file. */
export function formDataString(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}
