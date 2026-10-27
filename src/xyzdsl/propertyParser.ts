export interface XyzDslPropertyDeclaration {
  property: string;
  value: string;
  source: string;
}

export function parsePropertyDeclarations(source: string): { declarations: XyzDslPropertyDeclaration[]; diagnostics: string[] } {
  const declarations: XyzDslPropertyDeclaration[] = [];
  const diagnostics: string[] = [];

  source
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const [rawProperty, ...rawValueParts] = declaration.split(':');
      // Canonicalize legacy shell names before validation, preserving declaration order.
      const property = rawProperty?.trim().replace(/^box-surface(?=-|$)/, 'box-shell');
      const value = rawValueParts.join(':').trim();

      if (!property || !value) {
        if (property === 'surface' || property === 'box-shell' || property.startsWith('box-shell-') || property.startsWith('observable-')) declarations.push({ property, value, source: declaration });
        diagnostics.push(`Ignoring malformed declaration "${declaration}".`);
        return;
      }

      declarations.push({ property, value, source: declaration });
    });

  return { declarations, diagnostics };
}
