import React, { useId } from 'react';

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder = '',
  error = '',
  helperText = '',
  required = false,
  disabled = false,
  autoComplete,
  rows = 3,
  className = '',
  inputClassName = '',
  ...rest
}) {
  const generatedId = useId();
  const fieldId = name ? `field-${name}-${generatedId}` : generatedId;

  const baseInputStyle = `w-full rounded-lg border px-3.5 py-2 text-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/60 ${
    error
      ? 'border-red-500 bg-red-50/40 text-slate-900 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:bg-red-950/20 dark:text-slate-100 dark:focus:ring-red-900/40'
      : 'border-slate-300 bg-white text-slate-900 focus:border-brand-500 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/40'
  } ${inputClassName}`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
          {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}

      {type === 'textarea' ? (
        <textarea
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={baseInputStyle}
          {...rest}
        />
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={baseInputStyle}
          {...rest}
        />
      )}

      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

export default FormField;
