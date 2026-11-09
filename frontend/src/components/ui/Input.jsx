import React, { forwardRef, useId } from "react";

export const Input = forwardRef(function Input(
  {
    label,
    id,
    type = "text",
    error,
    helperText,
    required = false,
    className = "",
    rightElement,
    "aria-describedby": describedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-help`;
  const description =
    [describedBy, helperText && helperId, error && errorId]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700"
        >
          {label}{" "}
          {required && (
            <span aria-hidden="true" className="text-rose-600 font-bold">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={description}
          className={`w-full min-h-[42px] px-3.5 py-2 text-base sm:text-sm rounded-xl bg-white text-slate-900 border transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white shadow-2xs ${
            rightElement ? "pr-11" : ""
          } ${
            error
              ? "border-rose-400 focus:ring-rose-400/30"
              : "border-slate-300 focus:border-emerald-700 focus:ring-emerald-600/20"
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {helperText && (
        <p
          id={helperId}
          className="text-xs leading-relaxed text-slate-500 mt-1"
        >
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-semibold leading-relaxed text-rose-600 mt-1"
        >
          {error}
        </p>
      )}
    </div>
  );
});
