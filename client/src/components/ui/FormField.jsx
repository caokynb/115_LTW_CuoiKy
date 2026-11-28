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

  const baseInputStyle = `w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-cinema-bg disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-600 dark:disabled:bg-neutral-900 dark:disabled:text-neutral-400 ${
    error
      ? 'border-red-500 bg-red-50/60 text-neutral-900 placeholder:text-neutral-500 focus:border-red-500 dark:border-red-500 dark:bg-red-950/30 dark:text-neutral-100 dark:placeholder:text-neutral-400'
      : 'border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-500 focus:border-brand-600 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:border-brand-400'
  } ${inputClassName}`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          {label}
          {required && <span className="ml-1 text-red-600 dark:text-red-400" aria-hidden="true">*</span>}
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
        <p id={`${fieldId}-error`} role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-neutral-600 dark:text-neutral-300">{helperText}</p>
      ) : null}
    </div>
  );
}

export default FormField;
