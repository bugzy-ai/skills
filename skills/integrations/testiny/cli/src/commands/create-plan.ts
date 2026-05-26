import * as fs from 'node:fs/promises';
import { request } from '../client';
import type { TestinyTestPlan } from '../types';

interface CreatePlanArgs {
  project?: string;
  name: string;
  description?: string;
  descriptionFile?: string;
  chunked?: string;
}

// Testiny enforces a 16,000-char limit on TestPlan.description (verified against
// the live API during BUG-71 Phase 0). We aim for 15,500 per chunk to leave
// headroom for the footer we append.
const MAX_DESCRIPTION_CHARS = 16_000;
const CHUNK_SIZE_TARGET = 15_500;

export async function createPlan(args: CreatePlanArgs): Promise<void> {
  if (!args.name) throw new Error('--name is required');
  if (args.description && args.descriptionFile) {
    throw new Error('Pass either --description or --description-file, not both');
  }

  const projectIdStr = args.project ?? process.env.TESTINY_PROJECT_ID;
  if (!projectIdStr) {
    throw new Error('--project or TESTINY_PROJECT_ID env is required');
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    throw new Error(`--project must be a numeric id, got: "${projectIdStr}"`);
  }

  let description: string | undefined = args.description;
  if (args.descriptionFile) {
    description = await fs.readFile(args.descriptionFile, 'utf8');
  }

  // Fast path: no description or content within the limit — single create.
  if (!description || description.length <= MAX_DESCRIPTION_CHARS) {
    const body: Record<string, unknown> = {
      project_id: projectId,
      title: args.name,
    };
    if (description) body.description = description;
    const result = await request<TestinyTestPlan>('POST', '/testplan', body);
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  // Over the limit — require explicit opt-in to chunking.
  if (args.chunked !== 'true') {
    throw new Error(
      `description is ${description.length} chars; Testiny limits TestPlan.description to ${MAX_DESCRIPTION_CHARS}. ` +
        `Pass --chunked to split into multiple linked plans at section boundaries.`,
    );
  }

  const chunks = splitAtSections(description, CHUNK_SIZE_TARGET);
  const total = chunks.length;
  const totalChars = description.length;
  const created: TestinyTestPlan[] = [];

  for (let i = 0; i < total; i++) {
    const partNumber = i + 1;
    const body: Record<string, unknown> = {
      project_id: projectId,
      title: `${args.name} (Part ${partNumber} of ${total})`,
      description: withChunkFooter(chunks[i], partNumber, total, args.name, totalChars),
    };
    const result = await request<TestinyTestPlan>('POST', '/testplan', body);
    created.push(result);
  }

  process.stdout.write(
    JSON.stringify(
      {
        chunked: true,
        total_parts: total,
        original_chars: totalChars,
        plans: created.map((p) => ({ id: p.id, title: p.title })),
      },
      null,
      2,
    ),
  );
}

function withChunkFooter(
  chunk: string,
  partNumber: number,
  total: number,
  planName: string,
  originalChars: number,
): string {
  const footer =
    `\n\n---\n` +
    `*Part ${partNumber} of ${total} of "${planName}". ` +
    `The original source (${originalChars} chars) exceeded Testiny's ${MAX_DESCRIPTION_CHARS}-char-per-plan ` +
    `description limit, so it was split at section boundaries. ` +
    `Sibling parts are titled "${planName} (Part N of ${total})" — search Test Plans by title to find them.*`;
  return chunk + footer;
}

/**
 * Greedy section-aware split. Prefers `## ` (h2) boundaries; falls back to
 * `### ` (h3) for oversized sections; falls back to line boundaries; finally
 * hard-slices if a single line still exceeds the chunk target (unlikely for
 * real markdown).
 *
 * Exported for testing.
 */
export function splitAtSections(text: string, maxSize: number): string[] {
  if (text.length <= maxSize) return [text];

  const sections = splitKeepDelimiter(text, /^(?=## )/m);
  return greedyPack(sections, maxSize, (oversized) =>
    splitAtSubsections(oversized, maxSize),
  );
}

function splitAtSubsections(text: string, maxSize: number): string[] {
  const subs = splitKeepDelimiter(text, /^(?=### )/m);
  if (subs.length > 1) {
    return greedyPack(subs, maxSize, (oversized) => splitAtLines(oversized, maxSize));
  }
  return splitAtLines(text, maxSize);
}

function splitAtLines(text: string, maxSize: number): string[] {
  const lines = text.split('\n').map((l, i, arr) => (i < arr.length - 1 ? l + '\n' : l));
  return greedyPack(lines, maxSize, (oversized) => hardSlice(oversized, maxSize));
}

function hardSlice(text: string, maxSize: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxSize) {
    out.push(text.slice(i, i + maxSize));
  }
  return out;
}

/**
 * Splits text at occurrences of `pattern` but keeps the delimiter at the start
 * of each resulting part (zero-width lookahead). The portion before the first
 * match (if any) becomes the first element.
 */
function splitKeepDelimiter(text: string, pattern: RegExp): string[] {
  return text.split(pattern);
}

/**
 * Pack `parts` into chunks of at most `maxSize` chars. Any single part larger
 * than `maxSize` is handed to `recurse` for further subdivision.
 */
function greedyPack(
  parts: string[],
  maxSize: number,
  recurse: (oversized: string) => string[],
): string[] {
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current.length > 0) {
      chunks.push(current);
      current = '';
    }
  };

  for (const part of parts) {
    if (part.length === 0) continue;

    if (part.length > maxSize) {
      // Single part won't fit at any size — flush current, recurse, append sub-chunks.
      flush();
      const sub = recurse(part);
      // The last sub-chunk may have room for more upstream content; treat it
      // as the new `current` if it's small enough, otherwise emit all and start fresh.
      if (sub.length === 0) continue;
      for (let i = 0; i < sub.length - 1; i++) chunks.push(sub[i]);
      const last = sub[sub.length - 1];
      if (last.length < maxSize) {
        current = last;
      } else {
        chunks.push(last);
      }
    } else if (current.length + part.length > maxSize) {
      flush();
      current = part;
    } else {
      current += part;
    }
  }
  flush();
  return chunks;
}
