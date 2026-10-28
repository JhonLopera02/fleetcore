import { ValueTransformer } from 'typeorm';

/** PostgreSQL devuelve los NUMERIC como string; esto los convierte a number. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : parseFloat(value),
};
