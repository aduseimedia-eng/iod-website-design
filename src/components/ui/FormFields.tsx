import type { ChangeEventHandler, InputHTMLAttributes, SelectHTMLAttributes } from "react";

type FieldProps = { label: string; placeholder?: string; type?: string; required?: boolean; onChange?: ChangeEventHandler<HTMLInputElement> } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange">;

export function FormInput({ label, placeholder, type = "text", required = false, onChange, ...inputProps }: FieldProps) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[var(--color-ink)]">{label}{required && <span className="text-[var(--color-error)]"> *</span>}</span><input id={id} required={required} type={type} placeholder={placeholder} onChange={onChange} className="h-12 w-full border border-[var(--color-line)] bg-white px-4 text-sm outline-none transition-colors placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold-dark)]" {...inputProps} /></label>;
}

type SelectProps = { label: string; options: string[]; onChange?: ChangeEventHandler<HTMLSelectElement> } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange">;

export function SelectField({ label, options, onChange, ...selectProps }: SelectProps) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[var(--color-ink)]">{label}</span><select onChange={onChange} className="h-12 w-full border border-[var(--color-line)] bg-white px-4 text-sm outline-none focus:border-[var(--color-gold-dark)]" {...selectProps}><option value="">Select an option</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
