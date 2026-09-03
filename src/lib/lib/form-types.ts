// Shared shape for a single field inside a Forms & Lead Capture form.
// Stored as jsonb (an array of these) on the `forms.fields` column.

export type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";

export type FormField = {
  id: string; // stable id, used as the submission data key and React key
  label: string; // shown to the visitor filling out the form
  type: FieldType;
  required: boolean;
  options?: string[]; // only used when type === "select"
};

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export function newFieldId() {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultField(): FormField {
  return { id: newFieldId(), label: "", type: "text", required: false };
}

export const DEFAULT_FIELDS: FormField[] = [
  { id: "name", label: "Name", type: "text", required: true },
  { id: "email", label: "Email", type: "email", required: true },
  { id: "message", label: "Message", type: "textarea", required: false },
];

// Basic guard so a malformed/tampered fields array can't crash the builder
// or the public widget.
export function sanitizeFields(input: unknown): FormField[] {
  if (!Array.isArray(input)) return DEFAULT_FIELDS;
  const cleaned = input
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => {
      const type = FIELD_TYPES.some((t) => t.value === f.type) ? (f.type as FieldType) : "text";
      const field: FormField = {
        id: typeof f.id === "string" && f.id ? f.id : newFieldId(),
        label: typeof f.label === "string" ? f.label : "",
        type,
        required: Boolean(f.required),
      };
      if (type === "select") {
        field.options = Array.isArray(f.options)
          ? f.options.filter((o): o is string => typeof o === "string")
          : [];
      }
      return field;
    });
  return cleaned.length > 0 ? cleaned : DEFAULT_FIELDS;
}
