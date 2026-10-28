/** Falla al arrancar si falta alguna variable de entorno obligatoria. */
const REQUIRED = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'API_KEYS',
];

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')} (revisa tu .env)`);
  }
  return config;
}
