import { useCallback, useState } from "react";

function fieldError(control) {
  const value = control.value;
  if (control.validity.badInput) return "Masukkan angka yang valid.";
  const empty = control.type === "password" ? !value : !value.trim();
  if (control.required && empty) return "Kolom ini wajib diisi.";
  if (empty) return null;
  if (control.validity.typeMismatch) {
    return control.type === "email"
      ? "Masukkan alamat email yang valid."
      : "Periksa format isian ini.";
  }
  if (control.minLength > 0 && value.length < control.minLength) {
    return `Gunakan minimal ${control.minLength} karakter.`;
  }
  if (control.validity.rangeUnderflow || control.validity.rangeOverflow) {
    return control.min && control.max
      ? `Masukkan angka antara ${control.min} dan ${control.max}.`
      : "Nilai berada di luar batas yang diperbolehkan.";
  }
  if (control.validity.stepMismatch) return "Masukkan bilangan bulat.";
  if (!control.validity.valid) return "Periksa isian ini.";
  return null;
}

export function useFormValidation() {
  const [errors, setErrors] = useState({});

  const validate = useCallback((form, additionalErrors = {}) => {
    const next = {};
    const controls = Array.from(form.elements).filter(
      (control) => control.willValidate,
    );
    for (const control of controls) {
      const key = control.name || control.id;
      if (!key) continue;
      const error = fieldError(control) || additionalErrors[key];
      if (error) next[key] = error;
    }
    setErrors(next);
    const firstInvalid = controls.find(
      (control) => next[control.name || control.id],
    );
    firstInvalid?.focus();
    return Object.keys(next).length === 0;
  }, []);

  const clearError = useCallback((event) => {
    const key = event.target.name || event.target.id;
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, validate, clearError, clearErrors };
}
