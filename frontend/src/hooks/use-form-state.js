import { useCallback, useState } from 'react';

/**
 * Small form helper: values, field errors, and a field change handler.
 * Keeps each page free of repetitive useState boilerplate.
 */
export function useFormState(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  }, []);

  return { values, setValues, errors, setErrors, handleChange };
}
