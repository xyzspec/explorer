/** Rename property keys only; preserve authored paths, values, whitespace and line endings. */
export function migrateBoxShell(source: string): string {
  return source.replace(/^(\s*"[^"]+"\s*:\s*")([^"]*)("\s*)$/gm, (_line, prefix: string, properties: string, suffix: string) =>
    prefix + properties.replace(/(^|;)(\s*)box-surface(?=(?:-(?:top|right|bottom|left|front|back))?\s*:)/g, '$1$2box-shell') + suffix,
  );
}
