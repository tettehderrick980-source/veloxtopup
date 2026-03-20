/** Strips newline characters to prevent log injection (CWE-117) */
export const sanitizeLog = (value: unknown): string =>
  String(value).replace(/[\r\n]/g, ' ')
