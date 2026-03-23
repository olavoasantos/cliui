import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import {dirname, join, relative, resolve, extname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseSync} from 'oxc-parser';

// Types

/** Supported declaration kinds we extract */
export type DeclarationKind =
  | 'type'
  | 'interface'
  | 'enum'
  | 'class'
  | 'function'
  | 'variable'
  | 'namespace'
  | 'module'
  | 'global'
  | 'module-augmentation';

/** A single @tag from a JSDoc block */
export interface DocTag {
  tag: string;
  name?: string;
  description?: string;
  raw: string;
}

/** Parsed JSDoc comment */
export interface DocBlock {
  summary: string;
  description: string;
  tags: DocTag[];
  raw: string;
}

/** A type parameter like <T extends Foo = Bar> */
export interface TypeParameter {
  name: string;
  constraint?: string;
  default?: string;
}

/** A member inside an interface, class, enum, or namespace */
export interface MemberInfo {
  name: string;
  kind: string; // "property", "method", "enum-member", "index-signature", etc.
  type?: string | undefined;
  optional?: boolean | undefined;
  readonly?: boolean | undefined;
  static?: boolean | undefined;
  accessibility?: string | undefined; // "public" | "protected" | "private"
  value?: string | undefined;
  docblock?: DocBlock | undefined;
  typeParameters?: TypeParameter[] | undefined;
  parameters?: ParameterInfo[] | undefined;
  returnType?: string | undefined;
  referencedTypes?: string[] | undefined;
  raw: string;
}

/** A function/method parameter */
export interface ParameterInfo {
  name: string;
  type?: string;
  optional?: boolean;
  rest?: boolean;
  default?: string;
  referencedTypes?: string[];
}

/** An extracted declaration */
export interface Declaration {
  kind: DeclarationKind;
  name: string;
  exported: boolean;
  /** True for `declare global` and `declare module "..."` augmentations — always available as side effects */
  ambient?: boolean;
  docblock?: DocBlock;
  typeParameters?: TypeParameter[];
  extends?: string[];
  implements?: string[];
  members?: MemberInfo[];
  parameters?: ParameterInfo[]; // for export function declarations
  returnType?: string;
  value?: string; // for type aliases, the RHS; for variables, the type annotation
  declarations?: Declaration[]; // for namespaces/modules
  referencedTypes?: string[];
  raw: string;
}

/** A resolved import reference */
export interface ImportReference {
  /** The local name used in this file */
  name: string;
  /** The original exported name from the source module (differs for renames: `import { Foo as Bar }`) */
  originalName: string;
  /** The module specifier (e.g. '../application', '@micra/core') */
  source: string;
  /** Whether this is a type-only import (`import type { ... }`) */
  typeOnly: boolean;
}

/** A single source file's extracted data */
export interface FileEntry {
  filePath: string;
  imports: ImportReference[];
  declarations: Declaration[];
  errors: string[];
}

/** A package.json exports entry point */
export interface EntryPoint {
  /** The subpath pattern (e.g. ".", "./utils", "./types/*") */
  subpath: string;
  /** Resolved source file path(s) relative to sourceDir */
  resolvedPaths: string[];
  /** Names exported through this entry point */
  exportedNames: string[];
}

/** The full output */
export interface ExtractionResult {
  generatedAt: string;
  sourceDir: string;
  fileCount: number;
  declarationCount: number;
  /** Present when --public-api is used */
  entryPoints?: EntryPoint[];
  files: FileEntry[];
}

// Markdown Generation

interface MarkdownPage {
  fileName: string;
  title: string;
  summary?: string;
  body: string;
}

export function toMarkdown(result: ExtractionResult): string {
  const lines: string[] = [];

  for (const file of result.files) {
    lines.push(`## ${file.filePath}`);

    if (file.errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      for (const err of file.errors) lines.push(`- ${err}`);
      lines.push('');
    }

    for (const decl of file.declarations) {
      lines.push(renderDeclarationMarkdown(decl));
    }

    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

export function renderDeclarationMarkdown(decl: Declaration): string {
  const parts: string[] = [];
  const heading = decl.kind === 'function' ? `### \`${decl.name}()\`` : `### \`${decl.name}\``;

  parts.push('');
  parts.push(heading);

  if (decl.docblock?.summary) {
    parts.push('');
    parts.push(decl.docblock.summary);
  }

  parts.push('');
  parts.push('```ts');
  parts.push(renderDeclarationSignature(decl));
  parts.push('```');

  if (decl.members && decl.members.length > 0) {
    parts.push('');
    parts.push('Members:');
    for (const m of decl.members) {
      parts.push(`- \`${m.name}\` (${m.kind})`);
    }
  }

  return parts.join('\n');
}

function renderDeclarationSignature(decl: Declaration): string {
  // Prefer a signature-only rendering for functions that have bodies
  // to keep reference pages focused.
  if (decl.kind === 'function') {
    const hasBody = decl.raw.includes('{');
    if (!hasBody) return decl.raw.trim();

    const typeParams = decl.typeParameters?.length
      ? `<${decl.typeParameters
          .map((tp) => {
            const constraint = tp.constraint ? ` extends ${tp.constraint}` : '';
            const def = tp.default ? ` = ${tp.default}` : '';
            return `${tp.name}${constraint}${def}`;
          })
          .join(', ')}>`
      : '';

    const params = (decl.parameters ?? [])
      .map((p) => {
        const rest = p.rest ? '...' : '';
        const optional = p.optional ? '?' : '';
        const type = p.type ? `: ${p.type}` : '';
        return `${rest}${p.name}${optional}${type}`;
      })
      .join(', ');

    const ret = decl.returnType ? `: ${decl.returnType}` : '';

    return `export function ${decl.name}${typeParams}(${params})${ret};`;
  }

  if (decl.kind === 'type') {
    const typeParams = decl.typeParameters?.length
      ? `<${decl.typeParameters
          .map((tp) => {
            const constraint = tp.constraint ? ` extends ${tp.constraint}` : '';
            const def = tp.default ? ` = ${tp.default}` : '';
            return `${tp.name}${constraint}${def}`;
          })
          .join(', ')}>`
      : '';

    const rhs = decl.value ?? 'unknown';
    return `export type ${decl.name}${typeParams} = ${rhs};`;
  }

  // For interfaces/classes/enums/variables, the raw slice is usually concise.
  return decl.raw.trim();
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, {recursive: true});
  }
}

export function writeMarkdownPages(params: {
  outDir: string;
  packageName: string;
  sourceDir: string;
  entryPoints: EntryPoint[];
  result: ExtractionResult;
}): void {
  ensureDir(params.outDir);

  // Remove legacy per-rule pages from earlier generator iterations.
  // Rules are now grouped into their validator's page (e.g. float.md).
  for (const fileName of readdirSync(params.outDir)) {
    if (!fileName.endsWith('.md')) continue;
    if (fileName === 'index.md') continue;
    unlinkSync(join(params.outDir, fileName));
  }

  const pages = buildMarkdownPages(params);

  for (const page of pages) {
    const fullPath = join(params.outDir, page.fileName);
    const content = `# ${page.title}\n\n${page.body.trim()}\n`;
    writeFileSync(fullPath, content, 'utf-8');
  }
}

export function buildMarkdownPages(params: {
  outDir: string;
  packageName: string;
  sourceDir: string;
  entryPoints: EntryPoint[];
  result: ExtractionResult;
}): MarkdownPage[] {
  const {entryPoints, result, sourceDir, packageName} = params;

  const pages: MarkdownPage[] = [];

  const fileEntriesByAbsPath = new Map<string, FileEntry>();
  for (const file of result.files) {
    fileEntriesByAbsPath.set(resolve(sourceDir, file.filePath), file);
  }

  const RULE_SUBPATH = /^\.\/([^/]+)\/rules\/([^/]+)$/;
  const VALIDATOR_NAMES = new Set([
    'string',
    'number',
    'integer',
    'float',
    'bigint',
    'boolean',
    'symbol',
    'fn',
    'nil',
    'nullish',
    'any',
    'unknown',
    'never',
  ]);

  const validatorEntryPoints = new Map<string, EntryPoint>();
  const ruleEntryPointsByValidator = new Map<string, EntryPoint[]>();
  const otherEntryPoints: EntryPoint[] = [];

  for (const ep of entryPoints) {
    const ruleMatch = ep.subpath.match(RULE_SUBPATH);
    if (ruleMatch) {
      const validatorName = ruleMatch[1]!;
      if (!ruleEntryPointsByValidator.has(validatorName)) {
        ruleEntryPointsByValidator.set(validatorName, []);
      }
      ruleEntryPointsByValidator.get(validatorName)!.push(ep);
      continue;
    }

    const validatorMatch = ep.subpath.match(/^\.\/([^/]+)$/);
    if (validatorMatch && VALIDATOR_NAMES.has(validatorMatch[1]!)) {
      validatorEntryPoints.set(validatorMatch[1]!, ep);
      continue;
    }

    otherEntryPoints.push(ep);
  }

  // Non-validator pages (api, custom-rule, options, infer, ...)
  for (const ep of otherEntryPoints) {
    // Skip index.md (hand-maintained). We only generate api.md and other pages.
    const fileName = entryPointToDocFileName(ep.subpath);
    const importSpecifier = entryPointToImportSpecifier(packageName, ep.subpath);

    pages.push(
      buildSingleEntryPointPage({
        ep,
        fileName,
        importSpecifier,
        sourceDir,
        fileEntriesByAbsPath,
        packageName,
      }),
    );
  }

  // Validator pages (validator + all rules grouped together)
  for (const validatorName of [...VALIDATOR_NAMES].sort()) {
    const validatorEp = validatorEntryPoints.get(validatorName);
    if (!validatorEp) continue;

    const importSpecifier = entryPointToImportSpecifier(packageName, `./${validatorName}`);

    const bodyParts: string[] = [];

    bodyParts.push('```ts');
    bodyParts.push(`import * as api from '${importSpecifier}';`);
    bodyParts.push('```');

    if (validatorEp.exportedNames.length > 0) {
      bodyParts.push('');
      bodyParts.push('## Exports');
      bodyParts.push('');
      for (const name of validatorEp.exportedNames) {
        bodyParts.push(`- \`${name}\``);
      }
    }

    bodyParts.push('');
    bodyParts.push('## Validator');

    bodyParts.push(
      renderApiForEntryPoint({
        ep: validatorEp,
        sourceDir,
        fileEntriesByAbsPath,
      }),
    );

    const rules = (ruleEntryPointsByValidator.get(validatorName) ?? []).slice();
    rules.sort((a, b) => a.subpath.localeCompare(b.subpath));

    bodyParts.push('');
    bodyParts.push('## Rules');

    if (rules.length === 0) {
      bodyParts.push('');
      bodyParts.push('_No rules exported for this validator._');
    } else {
      for (const ruleEp of rules) {
        const ruleMatch = ruleEp.subpath.match(RULE_SUBPATH);
        const ruleName = ruleMatch?.[2] ?? ruleEp.subpath;

        const ruleImportSpecifier = entryPointToImportSpecifier(packageName, ruleEp.subpath);

        bodyParts.push('');
        bodyParts.push(`### \`${ruleName}\``);
        bodyParts.push('');
        bodyParts.push('```ts');
        if (ruleEp.exportedNames.length === 1) {
          bodyParts.push(`import {${ruleEp.exportedNames[0]}} from '${ruleImportSpecifier}';`);
        } else {
          bodyParts.push(`import * as rule from '${ruleImportSpecifier}';`);
        }
        bodyParts.push('```');

        bodyParts.push(
          renderApiForEntryPoint({
            ep: ruleEp,
            sourceDir,
            fileEntriesByAbsPath,
          }),
        );
      }
    }

    pages.push({
      fileName: `${validatorName}.md`,
      title: `\`${importSpecifier}\``,
      body: bodyParts.join('\n').trim(),
    });
  }

  return pages;
}

function buildSingleEntryPointPage(params: {
  ep: EntryPoint;
  fileName: string;
  importSpecifier: string;
  packageName: string;
  sourceDir: string;
  fileEntriesByAbsPath: Map<string, FileEntry>;
}): MarkdownPage {
  const bodyParts: string[] = [];

  bodyParts.push('```ts');
  bodyParts.push(`import * as api from '${params.importSpecifier}';`);
  bodyParts.push('```');

  if (params.ep.exportedNames.length > 0) {
    bodyParts.push('');
    bodyParts.push('## Exports');
    bodyParts.push('');
    for (const name of params.ep.exportedNames) {
      bodyParts.push(`- \`${name}\``);
    }
  }

  bodyParts.push('');
  bodyParts.push('## API');

  const api = renderApiForEntryPoint({
    ep: params.ep,
    sourceDir: params.sourceDir,
    fileEntriesByAbsPath: params.fileEntriesByAbsPath,
  });

  bodyParts.push(api);

  return {
    fileName: params.fileName,
    title: `\`${params.importSpecifier}\``,
    body: bodyParts.join('\n').trim(),
  };
}

function renderApiForEntryPoint(params: {
  ep: EntryPoint;
  sourceDir: string;
  fileEntriesByAbsPath: Map<string, FileEntry>;
}): string {
  // Trace from the entry point file so pages include re-exported symbols.
  const entryResolved = params.ep.resolvedPaths[0];
  const entryAbsPath = entryResolved ? resolve(params.sourceDir, entryResolved) : null;

  const localPublic = new Map<string, Set<string>>();
  if (entryAbsPath) {
    traceFile(entryAbsPath, '*', localPublic, new Set(), params.sourceDir);
  }

  const sections: string[] = [];
  const publicFiles = [...localPublic.entries()].sort(([a], [b]) => a.localeCompare(b));

  for (const [absFilePath, names] of publicFiles) {
    if (!names || names.size === 0) continue;

    const relFilePath = relative(params.sourceDir, absFilePath) || absFilePath;
    const entry = params.fileEntriesByAbsPath.get(absFilePath);
    if (!entry) continue;

    const decls = entry.declarations.filter((d) => d.exported && names.has(d.name));
    if (decls.length === 0) continue;

    sections.push('');
    sections.push(`### Source: \`${relFilePath}\``);

    for (const d of decls) {
      sections.push(renderDeclarationMarkdown(d));
    }
  }

  if (sections.length === 0) {
    return '_No exported declarations found for this entry point._';
  }

  return sections.join('\n').trim();
}

function entryPointToImportSpecifier(packageName: string, subpath: string): string {
  if (subpath === '.') return packageName;
  if (subpath.startsWith('./')) return `${packageName}/${subpath.slice(2)}`;
  return `${packageName}/${subpath}`;
}

export function entryPointToDocFileName(subpath: string): string {
  if (subpath === '.') return 'api.md';
  // './string/rules/minLength' -> 'string-rules-minLength.md'
  const normalized = subpath.replace(/^\.\//, '').replace(/\//g, '-');
  return `${normalized}.md`;
}

// Source Text Helper

/**
 * Extracts a substring from source using a span (ESTree-style start/end
 * byte offsets or character offsets).
 */
export function sliceBySpan(source: string, node: any): string {
  if (node == null) return '';
  // oxc-parser uses character offsets in start/end
  const start = node.start ?? node.range?.[0];
  const end = node.end ?? node.range?.[1];
  if (start == null || end == null) return '';
  return source.slice(start, end);
}

// JSDoc Parsing

/**
 * Parses a JSDoc comment string into a structured DocBlock.
 */
export function parseDocBlock(raw: string): DocBlock {
  // Strip the comment delimiters: /** ... */
  let body = raw;
  if (body.startsWith('/**')) body = body.slice(3);
  if (body.endsWith('*/')) body = body.slice(0, -2);

  // Remove leading * on each line
  const lines = body.split('\n').map((line) => line.replace(/^\s*\*\s?/, '').trimEnd());

  const tags: DocTag[] = [];
  const descriptionLines: string[] = [];
  let currentTag: {tag: string; lines: string[]} | null = null;

  for (const line of lines) {
    const [, tagName, tagContent] = line.match(/^@(\w+)\s*(.*)/) || [];
    if (tagName && tagContent) {
      // Flush previous tag
      if (currentTag) {
        tags.push(finalizeTag(currentTag));
      }
      currentTag = {tag: tagName, lines: [tagContent]};
    } else if (currentTag) {
      currentTag.lines.push(line);
    } else {
      descriptionLines.push(line);
    }
  }
  if (currentTag) {
    tags.push(finalizeTag(currentTag));
  }

  // Split description into summary (first paragraph) and full description
  const fullDesc = descriptionLines.join('\n').trim();
  const summaryEnd = fullDesc.indexOf('\n\n');
  const summary = summaryEnd > -1 ? fullDesc.slice(0, summaryEnd) : fullDesc;

  return {
    summary,
    description: fullDesc,
    tags,
    raw,
  };
}

export function finalizeTag(tag: {tag: string; lines: string[]}): DocTag {
  const combined = tag.lines.join('\n').trim();
  const tagName = tag.tag;

  // Tags that commonly have a name then description: @param, @property, @typedef, @template, etc.
  const namedTags = new Set([
    'param',
    'property',
    'prop',
    'typedef',
    'template',
    'typeParam',
    'typeparam',
    'fires',
    'emits',
    'listens',
    'alias',
  ]);

  let name: string = tagName;
  let description: string = combined;

  if (namedTags.has(tagName)) {
    // Handle: @param {type} name description
    // or:     @param name description
    // or:     @param name - description
    const withType = combined.match(/^\{[^}]*\}\s+(\S+)\s*[-–—]?\s*([\s\S]*)/);
    const withoutType = combined.match(/^(\S+)\s*[-–—]?\s*([\s\S]*)/);
    if (withType) {
      name = withType[1] || name;
      description = withType[2]?.trim() || description;
    } else if (withoutType) {
      name = withoutType[1] || name;
      description = withoutType[2]?.trim() || description;
    }
  }

  return {
    tag: tagName,
    name,
    description,
    raw: `@${tagName} ${combined}`,
  };
}

// Comment Matching

interface Comment {
  type: string; // "Block" or "Line"
  value: string;
  start: number;
  end: number;
}

/**
 * Finds the JSDoc block comment immediately preceding a node's start position.
 * A "leading" docblock must:
 *   1. Be a block comment starting with `*` (i.e. /** ... *​/)
 *   2. Have only whitespace between its end and the node's start
 */
export function findLeadingDocBlock(
  source: string,
  nodeStart: number,
  comments: Comment[],
): DocBlock | undefined {
  // Look for the closest block comment ending before nodeStart
  let best: Comment | undefined;

  for (const c of comments) {
    if (c.type !== 'Block') continue;
    if (!c.value.startsWith('*')) continue; // must be /** style
    if (c.end > nodeStart) continue;

    // Check that only whitespace sits between comment end and node start
    const gap = source.slice(c.end, nodeStart);

    // Allow whitespace and common decorators/export keywords in between
    if (/^[\s]*$/.test(gap) || /^[\s]*(export\s+(default\s+)?|declare\s+)*[\s]*$/.test(gap)) {
      if (!best || c.end > best.end) {
        best = c;
      }
    }
  }

  if (!best) return undefined;

  const rawComment = source.slice(best.start, best.end);
  return parseDocBlock(rawComment);
}

// Type Reference Collection

/** Built-in types that should not appear in referencedTypes */
const BUILTIN_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'void',
  'null',
  'undefined',
  'never',
  'any',
  'unknown',
  'object',
  'symbol',
  'bigint',
  'String',
  'Number',
  'Boolean',
  'Object',
  'Symbol',
  'BigInt',
  'Function',
  'Array',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Record',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Parameters',
  'ReturnType',
  'InstanceType',
  'ConstructorParameters',
  'ThisParameterType',
  'OmitThisParameter',
  'ThisType',
  'Uppercase',
  'Lowercase',
  'Capitalize',
  'Uncapitalize',
  'Awaited',
  'NoInfer',
]);

/**
 * Extracts the fully qualified name from a TSTypeReference typeName.
 * Handles both `Identifier` (simple) and `TSQualifiedName` (dotted).
 */
export function resolveTypeName(node: any): string {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name ?? '';
  if (node.type === 'TSQualifiedName') {
    const left = resolveTypeName(node.left);
    const right = node.right?.name ?? '';
    return left ? `${left}.${right}` : right;
  }
  return '';
}

/**
 * Recursively walks an AST node and collects all type names referenced
 * via TSTypeReference. Returns a deduplicated array, excluding built-ins.
 */
export function collectTypeReferences(node: any): string[] {
  const refs = new Set<string>();
  walkForTypeRefs(node, refs);
  return [...refs].sort();
}

export function walkForTypeRefs(node: any, refs: Set<string>): void {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'TSTypeReference') {
    const name = resolveTypeName(node.typeName);
    if (name && !BUILTIN_TYPES.has(name)) {
      refs.add(name);
    }
    // Still recurse into type arguments: Foo<Bar> should capture both Foo and Bar
    if (node.typeArguments || node.typeParameters) {
      walkForTypeRefs(node.typeArguments ?? node.typeParameters, refs);
    }
    return;
  }

  // For typeof expressions: `typeof Foo` references Foo
  if (node.type === 'TSTypeQuery') {
    const name = resolveTypeName(node.exprName);
    if (name && !BUILTIN_TYPES.has(name)) {
      refs.add(name);
    }
    return;
  }

  // Recurse into all child properties
  if (Array.isArray(node)) {
    for (const item of node) {
      walkForTypeRefs(item, refs);
    }
    return;
  }

  for (const key of Object.keys(node)) {
    // Skip parent pointers and non-type properties that cause cycles
    if (key === 'parent' || key === 'start' || key === 'end' || key === 'range' || key === 'loc')
      continue;
    const child = node[key];
    if (child && typeof child === 'object') {
      walkForTypeRefs(child, refs);
    }
  }
}

/**
 * Collects type references from multiple AST nodes and merges them.
 */
export function collectTypeRefsFromNodes(...nodes: any[]): string[] | undefined {
  const refs = new Set<string>();
  for (const node of nodes) {
    if (node) walkForTypeRefs(node, refs);
  }
  return refs.size > 0 ? [...refs].sort() : undefined;
}

// AST Extraction

export function extractTypeParameters(node: any, source: string): TypeParameter[] | undefined {
  const params = node.typeParameters?.params ?? node.typeParameters?.body;
  if (!params?.length) return undefined;

  return params.map((tp: any) => {
    const result: TypeParameter = {
      name: tp.name?.name ?? tp.name ?? sliceBySpan(source, tp.name),
    };
    if (tp.constraint) result.constraint = sliceBySpan(source, tp.constraint);
    if (tp.default) result.default = sliceBySpan(source, tp.default);
    return result;
  });
}

export function extractParameters(params: any[], source: string): ParameterInfo[] {
  return params.map((p: any) => {
    const info: ParameterInfo = {name: extractParamName(p, source)};

    // Type annotation
    const annotation = p.typeAnnotation?.typeAnnotation ?? p.typeAnnotation;
    if (annotation) {
      info.type = sliceBySpan(source, annotation);
      const refs = collectTypeReferences(annotation);
      if (refs.length) info.referencedTypes = refs;
    }

    if (p.optional) info.optional = true;

    // Rest parameter
    if (p.type === 'RestElement') {
      info.rest = true;
      info.name = extractParamName(p.argument ?? p, source);
      const restAnnotation =
        p.argument?.typeAnnotation?.typeAnnotation ??
        p.typeAnnotation?.typeAnnotation ??
        p.typeAnnotation;
      if (restAnnotation) {
        info.type = sliceBySpan(source, restAnnotation);
        const refs = collectTypeReferences(restAnnotation);
        if (refs.length) info.referencedTypes = refs;
      }
    }

    // Default value
    if (p.type === 'AssignmentPattern') {
      info.name = extractParamName(p.left, source);
      info.default = sliceBySpan(source, p.right);
      const assignAnnotation = p.left?.typeAnnotation?.typeAnnotation ?? p.left?.typeAnnotation;
      if (assignAnnotation) {
        info.type = sliceBySpan(source, assignAnnotation);
        const refs = collectTypeReferences(assignAnnotation);
        if (refs.length) info.referencedTypes = refs;
      }
    }

    return info;
  });
}

export function extractParamName(node: any, source: string): string {
  if (!node) return '<unknown>';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ObjectPattern' || node.type === 'ArrayPattern') {
    return sliceBySpan(source, node);
  }
  return node.name ?? sliceBySpan(source, node) ?? '<unknown>';
}

export function extractMembers(body: any[], source: string, comments: Comment[]): MemberInfo[] {
  const members: MemberInfo[] = [];

  for (const member of body) {
    const info = extractMember(member, source, comments);
    if (info) members.push(info);
  }

  return members;
}

/**
 * Resolves the accessibility of a class member.
 * - JS private fields (#name) → "#private"
 * - TS `private` keyword → "private"
 * - TS `protected` keyword → "protected"
 * - Everything else → "public"
 *
 * Only applies to class members (PropertyDefinition, MethodDefinition, etc).
 * Interface/enum members don't have accessibility — returns undefined for those.
 */
const CLASS_MEMBER_TYPES = new Set([
  'PropertyDefinition',
  'TSAbstractPropertyDefinition',
  'MethodDefinition',
  'TSAbstractMethodDefinition',
]);

export function resolveAccessibility(member: any): string | undefined {
  if (!CLASS_MEMBER_TYPES.has(member.type)) return undefined;

  // JS private field: key is a PrivateIdentifier or name starts with #
  if (member.key?.type === 'PrivateIdentifier' || (member.key?.name ?? '').startsWith('#')) {
    return '#private';
  }

  // TS keyword: private, protected, or default to public
  return member.accessibility ?? 'public';
}

export function extractMember(member: any, source: string, comments: Comment[]): MemberInfo | null {
  const start = member.start ?? member.range?.[0];
  const docblock = start != null ? findLeadingDocBlock(source, start, comments) : undefined;

  const raw = sliceBySpan(source, member);

  switch (member.type) {
    case 'TSPropertySignature':
    case 'PropertyDefinition':
    case 'TSAbstractPropertyDefinition': {
      const name = member.key?.name ?? member.key?.value ?? sliceBySpan(source, member.key);
      const annotation = member.typeAnnotation?.typeAnnotation ?? member.typeAnnotation;
      const info: MemberInfo = {
        name,
        kind: 'property',
        raw,
      };
      if (annotation) {
        info.type = sliceBySpan(source, annotation);
        const refs = collectTypeReferences(annotation);
        if (refs.length) info.referencedTypes = refs;
      }
      if (member.optional) info.optional = true;
      if (member.readonly) info.readonly = true;
      if (member.static) info.static = true;
      const accessibility = resolveAccessibility(member);
      if (accessibility) info.accessibility = accessibility;
      if (docblock) info.docblock = docblock;
      return info;
    }

    case 'TSMethodSignature':
    case 'MethodDefinition':
    case 'TSAbstractMethodDefinition': {
      const name = member.key?.name ?? member.key?.value ?? sliceBySpan(source, member.key);
      const fn = member.value ?? member; // MethodDefinition wraps in .value
      const params = fn.params?.params ?? fn.params ?? [];
      const info: MemberInfo = {
        name,
        kind: member.kind === 'get' ? 'getter' : member.kind === 'set' ? 'setter' : 'method',
        raw,
      };
      info.parameters = extractParameters(params, source);
      const returnAnnotation = fn.returnType?.typeAnnotation ?? fn.returnType;
      if (returnAnnotation) info.returnType = sliceBySpan(source, returnAnnotation);
      const methodTp = extractTypeParameters(fn, source) ?? extractTypeParameters(member, source);
      if (methodTp) info.typeParameters = methodTp;
      if (member.optional) info.optional = true;
      if (member.static) info.static = true;
      const methodAccessibility = resolveAccessibility(member);
      if (methodAccessibility) info.accessibility = methodAccessibility;
      if (docblock) info.docblock = docblock;
      // Aggregate referencedTypes from return type + type param constraints
      const methodRefs = collectTypeRefsFromNodes(
        returnAnnotation,
        fn.typeParameters ?? member.typeParameters,
      );
      if (methodRefs) info.referencedTypes = methodRefs;
      return info;
    }

    case 'TSIndexSignature': {
      const idxAnnotation = member.typeAnnotation?.typeAnnotation ?? member.typeAnnotation;
      const idxInfo: MemberInfo = {
        name: '[index]',
        kind: 'index-signature',
        type: sliceBySpan(source, idxAnnotation),
        readonly: member.readonly ?? false,
        docblock,
        raw,
      };
      const idxRefs = collectTypeRefsFromNodes(idxAnnotation);
      if (idxRefs) idxInfo.referencedTypes = idxRefs;
      return idxInfo;
    }

    case 'TSCallSignatureDeclaration': {
      const params = member.params?.params ?? member.params ?? [];
      const callRetAnnotation = member.returnType?.typeAnnotation ?? member.returnType;
      const info: MemberInfo = {
        name: '()',
        kind: 'call-signature',
        parameters: extractParameters(params, source),
        returnType: sliceBySpan(source, callRetAnnotation),
        docblock,
        raw,
      };
      const tp = extractTypeParameters(member, source);
      if (tp) info.typeParameters = tp;
      const callRefs = collectTypeRefsFromNodes(callRetAnnotation, member.typeParameters);
      if (callRefs) info.referencedTypes = callRefs;
      return info;
    }

    case 'TSConstructSignatureDeclaration': {
      const params = member.params?.params ?? member.params ?? [];
      const ctorRetAnnotation = member.returnType?.typeAnnotation ?? member.returnType;
      const info: MemberInfo = {
        name: 'new()',
        kind: 'construct-signature',
        parameters: extractParameters(params, source),
        returnType: sliceBySpan(source, ctorRetAnnotation),
        docblock,
        raw,
      };
      const tp = extractTypeParameters(member, source);
      if (tp) info.typeParameters = tp;
      const ctorRefs = collectTypeRefsFromNodes(ctorRetAnnotation, member.typeParameters);
      if (ctorRefs) info.referencedTypes = ctorRefs;
      return info;
    }

    case 'TSEnumMember': {
      const name = member.id?.name ?? member.id?.value ?? sliceBySpan(source, member.id);
      return {
        name,
        kind: 'enum-member',
        value: member.initializer ? sliceBySpan(source, member.initializer) : undefined,
        docblock,
        raw,
      };
    }

    default:
      return null;
  }
}

/**
 * Main extraction: walk the top-level body of a Program node
 * (or a namespace/module body) and pull out declarations.
 */
export function extractDeclarations(
  body: any[],
  source: string,
  comments: Comment[],
  exportedNames?: Set<string>,
): Declaration[] {
  const declarations: Declaration[] = [];

  for (const node of body) {
    const extracted = extractNode(node, source, comments, exportedNames);
    if (extracted) {
      declarations.push(...(Array.isArray(extracted) ? extracted : [extracted]));
    }
  }

  return declarations;
}

export function extractNode(
  node: any,
  source: string,
  comments: Comment[],
  exportedNames?: Set<string>,
): Declaration | Declaration[] | null {
  if (!node) return null;

  const nodeStart = node.start ?? node.range?.[0];

  switch (node.type) {
    // Export wrappers
    case 'ExportNamedDeclaration': {
      if (node.declaration) {
        const inner = extractNode(node.declaration, source, comments, exportedNames);
        if (inner) {
          const items = Array.isArray(inner) ? inner : [inner];
          for (const d of items) d.exported = true;
          return items;
        }
      }
      // export { Foo, Bar } — track names
      if (node.specifiers && exportedNames) {
        for (const spec of node.specifiers) {
          const name = spec.exported?.name ?? spec.local?.name;
          if (name) exportedNames.add(name);
        }
      }
      return null;
    }

    case 'ExportDefaultDeclaration': {
      if (node.declaration) {
        const inner = extractNode(node.declaration, source, comments, exportedNames);
        if (inner && !Array.isArray(inner)) {
          inner.exported = true;
          if (!inner.name) inner.name = 'default';
        }
        return inner;
      }
      return null;
    }

    // Type alias
    case 'TSTypeAliasDeclaration': {
      const decl: Declaration = {
        kind: 'type',
        name: node.id?.name ?? '',
        exported: false,
        raw: sliceBySpan(source, node),
      };
      decl.typeParameters = extractTypeParameters(node, source) ?? [];
      if (node.typeAnnotation) {
        decl.value = sliceBySpan(source, node.typeAnnotation);
      }
      decl.docblock = findLeadingDocBlock(source, nodeStart, comments)!;
      const typeRefs = collectTypeRefsFromNodes(node.typeAnnotation, node.typeParameters);
      if (typeRefs) decl.referencedTypes = typeRefs;
      return decl;
    }

    // Interface
    case 'TSInterfaceDeclaration': {
      const decl: Declaration = {
        kind: 'interface',
        name: node.id?.name ?? '',
        exported: false,
        raw: sliceBySpan(source, node),
      };
      decl.typeParameters = extractTypeParameters(node, source)!;
      if (node.extends?.length) {
        decl.extends = node.extends.map((e: any) => sliceBySpan(source, e));
      }
      const bodyMembers = node.body?.body ?? [];
      decl.members = extractMembers(bodyMembers, source, comments);
      decl.docblock = findLeadingDocBlock(source, nodeStart, comments)!;
      const ifaceRefs = collectTypeRefsFromNodes(...(node.extends ?? []), node.typeParameters);
      if (ifaceRefs) decl.referencedTypes = ifaceRefs;
      return decl;
    }

    // Enum
    case 'TSEnumDeclaration': {
      const decl: Declaration = {
        kind: 'enum',
        name: node.id?.name ?? '',
        exported: false,
        raw: sliceBySpan(source, node),
      };
      const enumMembers = node.body?.members ?? node.members ?? [];
      decl.members = extractMembers(enumMembers, source, comments);
      decl.docblock = findLeadingDocBlock(source, nodeStart, comments)!;
      return decl;
    }

    // Class
    case 'ClassDeclaration': {
      const decl: Declaration = {
        kind: 'class',
        name: node.id?.name ?? '',
        exported: false,
        raw: sliceBySpan(source, node),
      };
      decl.typeParameters = extractTypeParameters(node, source)!;
      if (node.superClass) {
        decl.extends = [sliceBySpan(source, node.superClass)];
        // Include type arguments on the extends
        if (node.superTypeParameters) {
          decl.extends = [
            sliceBySpan(source, node.superClass) + sliceBySpan(source, node.superTypeParameters),
          ];
        }
      }
      if (node.implements?.length) {
        decl.implements = node.implements.map((i: any) => sliceBySpan(source, i));
      }
      const classBody = node.body?.body ?? [];
      decl.members = extractMembers(classBody, source, comments);
      decl.docblock = findLeadingDocBlock(source, nodeStart, comments)!;
      const classRefs = collectTypeRefsFromNodes(
        node.superClass,
        node.superTypeParameters,
        ...(node.implements ?? []),
        node.typeParameters,
      );
      if (classRefs) decl.referencedTypes = classRefs;
      return decl;
    }

    // Function
    case 'FunctionDeclaration':
    case 'TSDeclareFunction': {
      const decl: Declaration = {
        kind: 'function',
        name: node.id?.name ?? '',
        exported: false,
        raw: sliceBySpan(source, node),
      };
      decl.typeParameters = extractTypeParameters(node, source)!;
      const params = node.params?.params ?? node.params ?? [];
      decl.parameters = extractParameters(params, source);
      const retAnnotation = node.returnType?.typeAnnotation ?? node.returnType;
      if (retAnnotation) decl.returnType = sliceBySpan(source, retAnnotation);
      decl.docblock = findLeadingDocBlock(source, nodeStart, comments)!;
      const fnRefs = collectTypeRefsFromNodes(retAnnotation, node.typeParameters);
      if (fnRefs) decl.referencedTypes = fnRefs;
      return decl;
    }

    // Variable declarations (const Foo: Type = ...)
    case 'VariableDeclaration': {
      const results: Declaration[] = [];
      for (const declarator of node.declarations ?? []) {
        const name = declarator.id?.name ?? sliceBySpan(source, declarator.id);
        const annotation =
          declarator.id?.typeAnnotation?.typeAnnotation ?? declarator.id?.typeAnnotation;

        const decl: Declaration = {
          kind: 'variable',
          name,
          exported: false,
          raw: sliceBySpan(source, node),
        };
        if (annotation) {
          decl.value = sliceBySpan(source, annotation);
          const varRefs = collectTypeReferences(annotation);
          if (varRefs.length) decl.referencedTypes = varRefs;
        }
        decl.docblock = findLeadingDocBlock(source, nodeStart, comments)!;
        results.push(decl);
      }
      return results.length === 1 ? results[0]! : results;
    }

    // Namespace / Module / Global / Module Augmentation
    case 'TSModuleDeclaration': {
      // Detect `declare global { ... }`
      const isGlobal =
        node.global === true ||
        node.kind === 'global' ||
        (node.id?.name === 'global' && node.declare === true);

      // Detect `declare module "some-package" { ... }` (string literal id = augmentation)
      const isStringModule =
        node.id?.type === 'Literal' ||
        node.id?.type === 'StringLiteral' ||
        typeof node.id?.value === 'string';
      const isModuleAugmentation = !isGlobal && isStringModule && node.declare === true;

      let kind: DeclarationKind;
      if (isGlobal) {
        kind = 'global';
      } else if (isModuleAugmentation) {
        kind = 'module-augmentation';
      } else {
        kind = node.kind === 'module' ? 'module' : 'namespace';
      }

      const decl: Declaration = {
        kind,
        name: isGlobal ? 'global' : (node.id?.name ?? node.id?.value ?? ''),
        exported: false,
        raw: sliceBySpan(source, node),
      };

      if (isGlobal || isModuleAugmentation) {
        decl.ambient = true;
        // Ambient declarations are always effectively "exported"
        decl.exported = true;
      }

      // Nested namespace: `namespace A.B.C { ... }`
      // oxc-parser may represent this as nested TSModuleDeclaration nodes
      let innerBody = node.body;
      while (innerBody?.type === 'TSModuleDeclaration') {
        decl.name += '.' + (innerBody.id?.name ?? innerBody.id?.value ?? '');
        innerBody = innerBody.body;
      }

      const nsBody = innerBody?.body ?? [];
      decl.declarations = extractDeclarations(nsBody, source, comments);
      decl.docblock = findLeadingDocBlock(source, nodeStart, comments)!;
      return decl;
    }

    default:
      return null;
  }
}

// File Discovery

export const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

export function findTsFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string) {
    const entries = readdirSync(current, {withFileTypes: true});
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip common non-source directories
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.next' ||
          entry.name === 'coverage'
        ) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && TS_EXTENSIONS.has(extname(entry.name))) {
        // Skip .d.ts files? We'll include them — they're often the most
        // important for reference docs. Filter later if needed.
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results.sort();
}

// Import Extraction

/**
 * Determines if a specifier is a relative path (./foo, ../bar)
 * as opposed to a bare/package specifier (@micra/core, lodash).
 */
export function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

/** Extensions to try when resolving a relative import to an actual file */
const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.d.ts',
  '/index.ts',
  '/index.tsx',
  '/index.d.ts',
];

/**
 * Resolves a relative import specifier to a file path relative to sourceDir.
 * Tries common TS extensions if the exact path doesn't exist.
 * Falls back to the raw resolved relative path if nothing matches on disk.
 */
export function resolveRelativeSource(
  specifier: string,
  filePath: string,
  sourceDir: string,
): string {
  const fileDir = dirname(filePath);
  const absolute = resolve(fileDir, specifier);

  // Try exact match first (e.g. importing a .json or already has extension)
  if (existsSync(absolute) && !statSync(absolute).isDirectory()) {
    return relative(sourceDir, absolute);
  }

  // Try with each extension
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = absolute + ext;
    if (existsSync(candidate)) {
      return relative(sourceDir, candidate);
    }
  }

  // If it's a directory with an index file, the /index.* attempts above
  // cover it. Fall back to the raw resolved relative path.
  return relative(sourceDir, absolute);
}

export function extractImports(
  body: any[],
  filePath: string,
  sourceDir: string,
): ImportReference[] {
  const imports: ImportReference[] = [];

  for (const node of body) {
    if (node.type !== 'ImportDeclaration') continue;

    const rawSource = node.source?.value ?? '';
    const resolvedSource = isRelativeImport(rawSource)
      ? resolveRelativeSource(rawSource, filePath, sourceDir)
      : rawSource;
    const isTypeOnly = node.importKind === 'type';

    for (const spec of node.specifiers ?? []) {
      switch (spec.type) {
        case 'ImportSpecifier': {
          // import { Foo } or import { Foo as Bar } or import type { Foo }
          const localName = spec.local?.name ?? '';
          const importedName = spec.imported?.name ?? spec.imported?.value ?? localName;
          imports.push({
            name: localName,
            originalName: importedName,
            source: resolvedSource,
            typeOnly: isTypeOnly || spec.importKind === 'type',
          });
          break;
        }
        case 'ImportDefaultSpecifier': {
          // import Foo from '...'
          imports.push({
            name: spec.local?.name ?? '',
            originalName: 'default',
            source: resolvedSource,
            typeOnly: isTypeOnly,
          });
          break;
        }
        case 'ImportNamespaceSpecifier': {
          // import * as Foo from '...'
          imports.push({
            name: spec.local?.name ?? '',
            originalName: '*',
            source: resolvedSource,
            typeOnly: isTypeOnly,
          });
          break;
        }
      }
    }
  }

  return imports;
}

// File Processing

export function processFile(filePath: string, sourceDir: string): FileEntry {
  const source = readFileSync(filePath, 'utf-8');
  const relativePath = relative(sourceDir, filePath);

  const entry: FileEntry = {
    filePath: relativePath,
    imports: [],
    declarations: [],
    errors: [],
  };

  try {
    const result = parseSync(filePath, source, {astType: 'ts'});

    // Collect errors
    if (result.errors?.length) {
      entry.errors = result.errors.map((e: any) =>
        typeof e === 'string' ? e : (e.message ?? JSON.stringify(e)),
      );
    }

    // Normalize comments
    const comments: Comment[] = (result.comments ?? []).map((c: any) => ({
      type: c.type,
      value: c.value,
      start: c.start ?? c.range?.[0],
      end: c.end ?? c.range?.[1],
    }));

    // Extract from the program body
    const body = result.program?.body ?? [];

    // Extract imports
    entry.imports = extractImports(body, filePath, sourceDir);

    // Track re-exports: `export { Foo }` without a declaration
    const exportedNames = new Set<string>();

    entry.declarations = extractDeclarations(body, source, comments, exportedNames);

    // Mark re-exported declarations
    for (const decl of entry.declarations) {
      if (!decl.exported && exportedNames.has(decl.name)) {
        decl.exported = true;
      }
    }
  } catch (err: any) {
    entry.errors.push(err.message ?? String(err));
  }

  return entry;
}

// Public API Resolution

/**
 * Reads package.json and extracts all export entry points.
 * Supports: `exports` field (string, object, conditional), `main`, `types`, `module`.
 */
export function readPackageEntryPoints(packageDir: string): Map<string, string> {
  const pkgPath = join(packageDir, 'package.json');
  if (!existsSync(pkgPath)) {
    throw new Error(`No package.json found in ${packageDir}`);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const entries = new Map<string, string>();

  if (pkg.exports) {
    collectExports(pkg.exports, '.', entries);
  } else {
    // Fallback to main/types/module fields
    const fallback = pkg.types ?? pkg.typings ?? pkg.module ?? pkg.main;
    if (fallback) {
      entries.set('.', fallback);
    }
  }

  return entries;
}

/**
 * Recursively walks the exports field to extract all subpath → file mappings.
 * Handles: string, conditional objects ({ import, require, types, default }),
 * and subpath patterns.
 */
export function collectExports(
  exports: any,
  currentPath: string,
  entries: Map<string, string>,
): void {
  if (typeof exports === 'string') {
    entries.set(currentPath, exports);
    return;
  }

  if (Array.isArray(exports)) {
    // First entry wins (fallback array)
    if (exports.length > 0) {
      collectExports(exports[0], currentPath, entries);
    }
    return;
  }

  if (typeof exports === 'object' && exports !== null) {
    // Check if this is a conditions object ({ import, types, default, ... })
    // vs a subpaths object ({ "./foo": ..., "./bar": ... })
    const keys = Object.keys(exports);
    const isConditions = keys.some((k) =>
      [
        'import',
        'require',
        'types',
        'default',
        'node',
        'browser',
        'development',
        'production',
      ].includes(k),
    );

    if (isConditions) {
      // Prefer: types → import → default → first value
      const resolved =
        exports.types ?? exports.import ?? exports.default ?? exports[keys[0] as string];
      if (resolved) {
        collectExports(resolved, currentPath, entries);
      }
    } else {
      // Subpath mappings
      for (const [subpath, value] of Object.entries(exports)) {
        const fullPath = subpath === '.' ? currentPath : subpath;
        collectExports(value, fullPath, entries);
      }
    }
  }
}

/**
 * Resolves an export entry point path (from package.json) to an actual
 * source file. Handles common patterns:
 *   - ./dist/index.js → ./src/index.ts (swap dist→src, .js→.ts)
 *   - ./dist/index.d.ts → ./src/index.ts
 *   - Already points to .ts → use directly
 */
export function resolveEntryPointToSource(entryPath: string, packageDir: string): string | null {
  const absolute = resolve(packageDir, entryPath);

  const isDeclarationFile = /\.d\.(ts|mts|cts)$/.test(absolute);

  // If it already points to a concrete source .ts file that exists, use it.
  // Note: `path.extname('index.d.ts')` is `.ts`, so we must explicitly exclude
  // declaration files here to avoid returning dist `.d.ts` entry points.
  const isSourceTsFile = TS_EXTENSIONS.has(extname(absolute)) && !isDeclarationFile;
  if (isSourceTsFile && existsSync(absolute)) {
    return absolute;
  }

  // Try direct .ts extension swap
  // (Only makes sense for non-.d.ts entry points; keep .d.ts out here)
  const tsSwaps = isDeclarationFile
    ? []
    : [
        // ./dist/index.js → ./dist/index.ts
        absolute.replace(/\.(js|mjs|cjs)$/, '.ts'),
        absolute.replace(/\.(js|mjs|cjs)$/, '.tsx'),
      ];

  for (const candidate of tsSwaps) {
    if (existsSync(candidate)) return candidate;
  }

  // Try src/ directory swap: ./dist/foo/index.js → ./src/foo/index.ts
  const srcVariants = [
    absolute.replace(/\/dist\//, '/src/').replace(/\.(js|mjs|cjs|d\.ts|d\.mts|d\.cts)$/, '.ts'),
    absolute.replace(/\/dist\//, '/src/').replace(/\.(js|mjs|cjs|d\.ts|d\.mts|d\.cts)$/, '.tsx'),
    absolute.replace(/\/build\//, '/src/').replace(/\.(js|mjs|cjs|d\.ts|d\.mts|d\.cts)$/, '.ts'),
    absolute.replace(/\/out\//, '/src/').replace(/\.(js|mjs|cjs|d\.ts|d\.mts|d\.cts)$/, '.ts'),
  ];

  for (const candidate of srcVariants) {
    if (existsSync(candidate)) return candidate;
  }

  // Try with TS extensions appended (entry might omit extension)
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = absolute + ext;
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Represents a re-export found in a file.
 */
interface ReExport {
  /** Names being re-exported. Empty array means `export * from` (all) */
  names: string[];
  /** Whether this is `export *` (re-exports everything) */
  star: boolean;
  /** Resolved source file path */
  source: string;
  /** Original name → exported name mapping for renames */
  renames: Map<string, string>;
}

/**
 * Parses a file and extracts:
 *   - Locally declared + exported names
 *   - Re-exports (export * from, export { X } from)
 */
export function analyzeFileExports(filePath: string): {
  localExports: Set<string>;
  reExports: ReExport[];
} {
  const localExports = new Set<string>();
  const reExports: ReExport[] = [];

  const source = readFileSync(filePath, 'utf-8');
  const result = parseSync(filePath, source, {astType: 'ts'});
  const body = result.program?.body ?? [];

  for (const node of body) {
    switch (node.type) {
      case 'ExportNamedDeclaration': {
        if (node.source) {
          // export { Foo, Bar } from './somewhere'
          // export * as NS from './somewhere'
          const rawSource = node.source.value ?? '';
          const resolvedAbsolute = isRelativeImport(rawSource)
            ? resolve(dirname(filePath), rawSource)
            : rawSource;

          const names: string[] = [];
          const renames = new Map<string, string>();

          for (const spec of node.specifiers ?? []) {
            const localName = 'name' in spec.local ? spec.local.name : spec.local.value;
            const exportedName = spec.exported
              ? 'name' in spec.exported
                ? spec.exported.name
                : spec.exported.value
              : localName;
            names.push(exportedName);
            if (localName !== exportedName) {
              renames.set(localName, exportedName);
            }
          }

          // Find the actual file for the resolved source
          let resolvedFile = resolvedAbsolute;
          if (isRelativeImport(rawSource)) {
            for (const ext of ['', ...RESOLVE_EXTENSIONS.map((e) => e)]) {
              const candidate = resolvedAbsolute + ext;
              if (existsSync(candidate) && !statSync(candidate).isDirectory()) {
                resolvedFile = candidate;
                break;
              }
            }
          }

          reExports.push({names, star: false, source: resolvedFile, renames});
        } else if (node.declaration) {
          // export const/function/class/type/interface ...
          extractDeclaredNames(node.declaration, localExports);
        } else if (node.specifiers) {
          // export { Foo, Bar } (local re-export)
          for (const spec of node.specifiers) {
            const name = spec.exported
              ? 'name' in spec.exported
                ? spec.exported.name
                : spec.exported.value
              : 'name' in spec.local
                ? spec.local.name
                : spec.local.value;
            if (name) localExports.add(name);
          }
        }
        break;
      }

      case 'ExportDefaultDeclaration': {
        localExports.add('default');
        break;
      }

      case 'ExportAllDeclaration': {
        // export * from './somewhere'
        const rawSource = node.source?.value ?? '';
        const resolvedAbsolute = isRelativeImport(rawSource)
          ? resolve(dirname(filePath), rawSource)
          : rawSource;

        let resolvedFile = resolvedAbsolute;
        if (isRelativeImport(rawSource)) {
          for (const ext of ['', ...RESOLVE_EXTENSIONS]) {
            const candidate = resolvedAbsolute + ext;
            if (existsSync(candidate) && !statSync(candidate).isDirectory()) {
              resolvedFile = candidate;
              break;
            }
          }
        }

        if (node.exported) {
          // export * as NS from './somewhere'
          localExports.add('name' in node.exported ? node.exported.name : node.exported.value);
        } else {
          // export * from './somewhere'
          reExports.push({
            names: [],
            star: true,
            source: resolvedFile,
            renames: new Map(),
          });
        }
        break;
      }
    }
  }

  return {localExports, reExports};
}

/**
 * Extracts declared names from a declaration node.
 */
export function extractDeclaredNames(node: any, names: Set<string>): void {
  if (!node) return;

  switch (node.type) {
    case 'VariableDeclaration':
      for (const decl of node.declarations ?? []) {
        if (decl.id?.name) names.add(decl.id.name);
      }
      break;
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
    case 'TSDeclareFunction':
    case 'TSTypeAliasDeclaration':
    case 'TSInterfaceDeclaration':
    case 'TSEnumDeclaration':
    case 'TSModuleDeclaration':
      if (node.id?.name) names.add(node.id.name);
      break;
  }
}

/** A matched file from wildcard expansion, with the captured stem */
interface WildcardMatch {
  /** Absolute path to the matched file */
  filePath: string;
  /** What the `*` captured (e.g. "utilities/GlobToPath") */
  stem: string;
}

/**
 * Expands a wildcard entry point pattern into matching files.
 * e.g. "./src/*.d.ts" → ["./src/Foo.d.ts", "./src/utils/Bar.d.ts", ...]
 *
 * In package.json exports, `*` matches across path segments, so
 * "./*": "./src/*.d.ts" means * can capture "utilities/UseConfig"
 * to resolve to ./src/utilities/UseConfig.d.ts.
 *
 * Also applies source file resolution (dist→src, .js→.ts).
 */
export function expandWildcardEntryPoint(
  entryPath: string,
  packageDir: string,
): {pattern: string; matches: WildcardMatch[]} {
  if (!entryPath.includes('*')) {
    return {pattern: entryPath, matches: []};
  }

  const absolute = resolve(packageDir, entryPath);
  const starIndex = absolute.indexOf('*');

  // Split into: base directory, filename prefix before *, filename suffix after *
  const beforeStar = absolute.slice(0, starIndex);
  const afterStar = absolute.slice(starIndex + 1); // e.g. ".d.ts"

  // The base directory is everything up to the last /
  const lastSlash = beforeStar.lastIndexOf('/');
  const baseDir = beforeStar.slice(0, lastSlash);
  const filePrefix = beforeStar.slice(lastSlash + 1); // usually "" for ./src/*

  // Build candidate base directories (try src swaps)
  const candidateDirs = [baseDir];
  for (const [from, to] of [
    ['/dist/', '/src/'],
    ['/build/', '/src/'],
    ['/out/', '/src/'],
  ]) {
    if (baseDir.includes(String(from))) {
      candidateDirs.push(baseDir.replace(String(from), String(to)));
    }
  }

  // Extension variants for matching
  const suffixVariants = new Set([afterStar]);
  if (afterStar.endsWith('.js')) {
    suffixVariants.add(afterStar.replace(/\.js$/, '.ts'));
    suffixVariants.add(afterStar.replace(/\.js$/, '.tsx'));
  }
  if (afterStar.endsWith('.mjs')) {
    suffixVariants.add(afterStar.replace(/\.mjs$/, '.mts'));
    suffixVariants.add(afterStar.replace(/\.mjs$/, '.ts'));
  }
  if (afterStar.endsWith('.d.ts')) {
    suffixVariants.add(afterStar.replace(/\.d\.ts$/, '.ts'));
    suffixVariants.add(afterStar.replace(/\.d\.ts$/, '.tsx'));
  }
  if (afterStar.endsWith('.d.mts')) {
    suffixVariants.add(afterStar.replace(/\.d\.mts$/, '.mts'));
    suffixVariants.add(afterStar.replace(/\.d\.mts$/, '.ts'));
  }

  const matches: WildcardMatch[] = [];
  const seen = new Set<string>();

  for (const dir of candidateDirs) {
    if (!existsSync(dir)) continue;

    // Recursively walk the directory since * matches across path segments
    const allFiles = findTsFiles(dir);

    for (const fullPath of allFiles) {
      // Get the path relative to the base dir
      const relToBase = relative(dir, fullPath);

      const matchesPrefix = !filePrefix || relToBase.startsWith(filePrefix);
      if (!matchesPrefix) continue;

      // Find which suffix variant matches and extract the stem
      let matchedSuffix: string | null = null;
      for (const sfx of suffixVariants) {
        if (!sfx || fullPath.endsWith(sfx)) {
          matchedSuffix = sfx;
          break;
        }
      }
      if (matchedSuffix === null) continue;

      // Compute the stem: strip the prefix and the matched suffix
      let stem = relToBase;
      if (filePrefix) stem = stem.slice(filePrefix.length);
      if (matchedSuffix) stem = stem.slice(0, stem.length - matchedSuffix.length);

      if (!seen.has(fullPath)) {
        seen.add(fullPath);
        matches.push({filePath: fullPath, stem});
      }
    }

    if (matches.length > 0) break;
  }

  matches.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return {pattern: entryPath, matches};
}

/**
 * Starting from entry point files, recursively traces all re-exports
 * to build a complete set of { filePath, exportedNames } pairs that
 * are part of the public API.
 *
 * Returns a Map<absoluteFilePath, Set<exportedName>>.
 * A name of "*" means all exports from that file are public.
 */
export function tracePublicApi(
  entryPoints: Map<string, string>,
  packageDir: string,
  sourceDir: string,
): Map<string, Set<string>> {
  const publicFiles = new Map<string, Set<string>>();
  const visited = new Set<string>();

  for (const [, entryPath] of entryPoints) {
    if (entryPath.includes('*')) {
      // Wildcard entry point — expand and trace each matched file
      const {matches} = expandWildcardEntryPoint(entryPath, packageDir);
      for (const {filePath: matchedFile} of matches) {
        traceFile(matchedFile, '*', publicFiles, visited, sourceDir);
      }
    } else {
      const resolved = resolveEntryPointToSource(entryPath, packageDir);
      if (!resolved) continue;
      traceFile(resolved, '*', publicFiles, visited, sourceDir);
    }
  }

  return publicFiles;
}

export function traceFile(
  filePath: string,
  requestedName: string, // "*" means all exports
  publicFiles: Map<string, Set<string>>,
  visited: Set<string>,
  sourceDir: string,
): void {
  // Prevent infinite cycles
  const visitKey = `${filePath}::${requestedName}`;
  if (visited.has(visitKey)) return;
  visited.add(visitKey);

  if (!existsSync(filePath)) return;

  const {localExports, reExports} = analyzeFileExports(filePath);

  // Track which names from this file are public
  if (!publicFiles.has(filePath)) {
    publicFiles.set(filePath, new Set());
  }
  const filePublicNames = publicFiles.get(filePath)!;

  if (requestedName === '*') {
    // All local exports are public
    for (const name of localExports) {
      filePublicNames.add(name);
    }
    // Follow all re-exports
    for (const reExport of reExports) {
      if (!isRelativeImport(reExport.source) && !existsSync(reExport.source)) continue;
      if (reExport.star) {
        traceFile(reExport.source, '*', publicFiles, visited, sourceDir);
      } else {
        for (const name of reExport.names) {
          traceFile(reExport.source, name, publicFiles, visited, sourceDir);
        }
      }
    }
  } else {
    // Looking for a specific name
    if (localExports.has(requestedName)) {
      filePublicNames.add(requestedName);
    } else {
      // Check re-exports
      for (const reExport of reExports) {
        if (!isRelativeImport(reExport.source) && !existsSync(reExport.source)) continue;
        if (reExport.star) {
          // Could come from the star export — follow it
          traceFile(reExport.source, requestedName, publicFiles, visited, sourceDir);
        } else if (reExport.names.includes(requestedName)) {
          // Find the original name (handle renames)
          let originalName = requestedName;
          for (const [from, to] of reExport.renames) {
            if (to === requestedName) {
              originalName = from;
              break;
            }
          }
          traceFile(reExport.source, originalName, publicFiles, visited, sourceDir);
        }
      }
    }
  }
}

/**
 * Builds EntryPoint records for the output.
 */
export function buildEntryPointRecords(
  entryPoints: Map<string, string>,
  _publicFiles: Map<string, Set<string>>,
  packageDir: string,
  sourceDir: string,
): EntryPoint[] {
  const records: EntryPoint[] = [];

  for (const [subpath, entryPath] of entryPoints) {
    if (entryPath.includes('*')) {
      // Wildcard — expand into individual entries per matched file
      const {matches} = expandWildcardEntryPoint(entryPath, packageDir);

      if (matches.length === 0) {
        records.push({
          subpath,
          resolvedPaths: [entryPath],
          exportedNames: [],
        });
        continue;
      }

      for (const {filePath: matchedFile, stem} of matches) {
        // Construct the concrete subpath by replacing * with the captured stem
        const concreteSubpath = subpath.replace('*', stem);

        const localPublic = new Map<string, Set<string>>();
        const localVisited = new Set<string>();
        traceFile(matchedFile, '*', localPublic, localVisited, sourceDir);

        const allNames = new Set<string>();
        for (const names of localPublic.values()) {
          for (const name of names) allNames.add(name);
        }

        records.push({
          subpath: concreteSubpath,
          resolvedPaths: [relative(sourceDir, matchedFile)],
          exportedNames: [...allNames].sort(),
        });
      }
    } else {
      const resolved = resolveEntryPointToSource(entryPath, packageDir);
      if (!resolved) {
        records.push({
          subpath,
          resolvedPaths: [entryPath],
          exportedNames: [],
        });
        continue;
      }

      // Collect all names reachable from this entry point
      const localPublic = new Map<string, Set<string>>();
      const localVisited = new Set<string>();
      traceFile(resolved, '*', localPublic, localVisited, sourceDir);

      const allNames = new Set<string>();
      for (const names of localPublic.values()) {
        for (const name of names) allNames.add(name);
      }

      records.push({
        subpath,
        resolvedPaths: [relative(sourceDir, resolved)],
        exportedNames: [...allNames].sort(),
      });
    }
  }

  return records;
}

// CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
 generate-docs — Extract types, interfaces, and docblocks from TypeScript files.

 Usage:
   generate-docs <source-dir> [options]

 Options:
   --out <file>     Output JSON file path (default: stdout)
   --pretty         Pretty-print the JSON output
   --exported       Only include exported declarations
   --public-api     Only include declarations reachable from package.json exports
                    (looks for package.json in source-dir or its parents)
   --md-out <dir>   Also write reference markdown pages into <dir>
                    (requires --public-api; will overwrite files)
   --no-variables   Skip variable declarations
   --help           Show this help message

 Examples:
   generate-docs ./src --out docs.json --pretty
   generate-docs ./src/types --exported --pretty
   generate-docs ./packages/core --public-api --out public-api.json --pretty
   generate-docs ./src --public-api --md-out ./docs/references
 `);
    process.exit(0);
  }

  if (args[0] == null) {
    throw new Error('Source directory argument is required. Use --help for usage information.');
  }

  const sourceDir = resolve(args[0]);
  const outIndex = args.indexOf('--out');
  const outFile = outIndex > -1 ? args[outIndex + 1] : null;

  const mdOutIndex = args.indexOf('--md-out');
  const mdOutDir = mdOutIndex > -1 ? args[mdOutIndex + 1] : null;

  const pretty = args.includes('--pretty');
  const exportedOnly = args.includes('--exported');
  const publicApiOnly = args.includes('--public-api');
  const noVariables = args.includes('--no-variables');

  console.error(`Scanning ${sourceDir} ...`);

  // Public API mode: trace from package.json exports
  let publicApiFiles: Map<string, Set<string>> | null = null;
  let entryPointRecords: EntryPoint[] | undefined;

  if (publicApiOnly) {
    // Walk up from sourceDir to find package.json
    let packageDir = sourceDir;
    while (!existsSync(join(packageDir, 'package.json'))) {
      const parent = dirname(packageDir);
      if (parent === packageDir) {
        console.error('Error: Could not find package.json in or above source directory');
        process.exit(1);
      }
      packageDir = parent;
    }

    console.error(`Found package.json in ${relative(process.cwd(), packageDir) || '.'}`);
    const entryPoints = readPackageEntryPoints(packageDir);
    console.error(
      `Found ${entryPoints.size} entry point(s): ${[...entryPoints.keys()].join(', ')}`,
    );

    publicApiFiles = tracePublicApi(entryPoints, packageDir, sourceDir);
    entryPointRecords = buildEntryPointRecords(entryPoints, publicApiFiles, packageDir, sourceDir);

    const reachableCount = [...publicApiFiles.values()].reduce((sum, names) => sum + names.size, 0);
    console.error(
      `Traced ${reachableCount} public declaration(s) across ${publicApiFiles.size} file(s)`,
    );
  }

  const allFiles = findTsFiles(sourceDir);
  console.error(`Found ${allFiles.length} TypeScript file(s)`);

  // In public API mode, prefer processing only files that are reachable from exports.
  // (The reachability graph is built using resolved entry points, so these file paths
  // are the most reliable set to process.)
  const files = publicApiFiles ? [...publicApiFiles.keys()] : allFiles;

  const fileEntries: FileEntry[] = [];
  let totalDeclarations = 0;

  for (const filePath of files) {
    const entry = processFile(filePath, sourceDir);

    // In public API mode, filter to only publicly reachable declarations + ambient
    if (publicApiFiles) {
      const publicNames = publicApiFiles.get(filePath);
      if (publicNames && !publicNames.has('*')) {
        entry.declarations = entry.declarations.filter(
          (d) => publicNames.has(d.name) || d.ambient === true,
        );
      }
      // Always filter to exported only in public API mode
      entry.declarations = filterExported(entry.declarations);
    }

    // Apply other filters
    if (exportedOnly && !publicApiOnly) {
      entry.declarations = filterExported(entry.declarations);
    }
    if (noVariables) {
      entry.declarations = entry.declarations.filter((d) => d.kind !== 'variable');
    }

    // Only include files that have declarations or errors
    if (entry.declarations.length > 0 || entry.errors.length > 0) {
      totalDeclarations += countDeclarations(entry.declarations);
      fileEntries.push(entry);
    }
  }

  // In public API mode, also scan all files for ambient declarations (e.g. module augmentations)
  // so they can be documented even if they aren't reachable through exports.
  if (publicApiFiles) {
    for (const filePath of allFiles) {
      if (publicApiFiles.has(filePath)) continue;
      const entry = processFile(filePath, sourceDir);
      entry.declarations = entry.declarations.filter((d) => d.ambient === true);
      if (noVariables) {
        entry.declarations = entry.declarations.filter((d) => d.kind !== 'variable');
      }
      if (entry.declarations.length > 0 || entry.errors.length > 0) {
        totalDeclarations += countDeclarations(entry.declarations);
        fileEntries.push(entry);
      }
    }
  }

  const result: ExtractionResult = {
    generatedAt: new Date().toISOString(),
    sourceDir: relative(process.cwd(), sourceDir) || '.',
    fileCount: fileEntries.length,
    declarationCount: totalDeclarations,
    files: fileEntries,
  };

  if (entryPointRecords) {
    result.entryPoints = entryPointRecords;
  }

  const json = JSON.stringify(result, null, pretty ? 2 : undefined);

  if (outFile) {
    writeFileSync(resolve(outFile), json, 'utf-8');
    console.error(
      `Wrote ${outFile} (${totalDeclarations} declarations from ${fileEntries.length} files)`,
    );
  } else {
    process.stdout.write(json + '\n');
  }

  if (mdOutDir) {
    if (!publicApiOnly || !entryPointRecords) {
      throw new Error('`--md-out` requires `--public-api` so entry points can be mapped to pages.');
    }

    const absoluteOutDir = resolve(mdOutDir);

    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    const packageName = pkg.name ?? '@micra/terminal-dom';

    writeMarkdownPages({
      outDir: absoluteOutDir,
      packageName,
      sourceDir,
      entryPoints: entryPointRecords,
      result,
    });
    console.error(`Wrote markdown reference pages to ${relative(process.cwd(), absoluteOutDir)}`);
  }
}

function filterExported(declarations: Declaration[]): Declaration[] {
  return declarations.flatMap((d) => {
    // Ambient declarations (declare global, declare module "...") are always public
    if (d.ambient) return [d];

    if (d.kind === 'namespace' || d.kind === 'module') {
      // Keep namespace if it's exported or contains exported children
      const filteredChildren = d.declarations ? filterExported(d.declarations) : [];
      if (d.exported || filteredChildren.length > 0) {
        return [{...d, declarations: filteredChildren}];
      }
      return [];
    }
    return d.exported ? [d] : [];
  });
}

function countDeclarations(declarations: Declaration[]): number {
  let count = 0;
  for (const d of declarations) {
    count += 1;
    if (d.declarations) count += countDeclarations(d.declarations);
  }
  return count;
}

const entryFile = process.argv[1];
if (entryFile) {
  const entryFileUrl = pathToFileURL(resolve(entryFile)).href;
  const thisFileUrl = import.meta.url;
  const isMain = thisFileUrl === entryFileUrl;

  // Some runners (like tsx) may wrap the entrypoint; fall back to comparing
  // resolved file paths if URLs differ.
  const isMainByPath = fileURLToPath(thisFileUrl) === resolve(entryFile);

  if (isMain || isMainByPath) {
    main();
  }
}
