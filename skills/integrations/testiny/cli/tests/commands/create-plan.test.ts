import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createPlan, splitAtSections } from '../../src/commands/create-plan';
import { mockOk } from '../mock-response';

describe('create-plan', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key', TESTINY_PROJECT_ID: '1' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --name is missing', async () => {
    await expect(createPlan({ name: '' })).rejects.toThrow('--name is required');
  });

  it('throws if neither --project nor TESTINY_PROJECT_ID is set', async () => {
    delete process.env.TESTINY_PROJECT_ID;
    await expect(createPlan({ name: 'P' })).rejects.toThrow(
      '--project or TESTINY_PROJECT_ID env is required'
    );
  });

  it('throws on non-numeric --project', async () => {
    await expect(createPlan({ name: 'P', project: 'PROJ' })).rejects.toThrow(
      '--project must be a numeric id'
    );
  });

  it('throws when both --description and --description-file are passed', async () => {
    await expect(createPlan({ name: 'P', description: 'x', descriptionFile: 'y' })).rejects.toThrow(
      'either --description or --description-file, not both'
    );
  });

  it('POSTs to /testplan with project_id + title (mapped from --name)', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 7, title: 'My Plan', project_id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    await createPlan({ name: 'My Plan' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.testiny.io/api/v1/testplan');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ project_id: 1, title: 'My Plan' });
  });

  it('includes description only when provided', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 1, title: 'P', project_id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    await createPlan({ name: 'P', description: '# Scope\nAll suites' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.description).toBe('# Scope\nAll suites');
  });

  it('uses TESTINY_PROJECT_ID env when --project omitted', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 1, title: 'P', project_id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    await createPlan({ name: 'P' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.project_id).toBe(1);
  });

  it('reads description from --description-file when passed', async () => {
    // Use a real temp file — fs/promises exports are non-configurable in
    // Node 22+, so we exercise the real read path instead of mocking.
    const tmpFile = path.join(os.tmpdir(), `testiny-cli-test-${Date.now()}.md`);
    await fs.writeFile(tmpFile, '# From file\n\nbody', 'utf8');

    try {
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockOk({ id: 1, title: 'P', project_id: 1 }));
      vi.stubGlobal('fetch', mockFetch);

      await createPlan({ name: 'P', descriptionFile: tmpFile });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.description).toBe('# From file\n\nbody');
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  });

  it('throws when description exceeds 16K and --chunked is not set', async () => {
    const huge = 'a'.repeat(20_000);
    await expect(createPlan({ name: 'Big', description: huge })).rejects.toThrow(
      /exceeds.*16000|chars.*Testiny limits/i,
    );
  });

  describe('chunked mode', () => {
    function makeSection(header: string, bodySize: number): string {
      return `${header}\n${'x'.repeat(bodySize)}\n`;
    }

    it('creates one plan per chunk and emits a summary', async () => {
      // Three ~8K sections = 3 chunks of ~8K each (well under 15.5K per chunk),
      // but we force chunking by making total > 16K.
      const description = [
        makeSection('## Section 1', 8000),
        makeSection('## Section 2', 8000),
        makeSection('## Section 3', 8000),
      ].join('');

      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      let nextId = 100;
      const mockFetch = vi.fn().mockImplementation(async () =>
        mockOk({ id: nextId++, title: 'placeholder', project_id: 1 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      await createPlan({ name: 'Big Plan', description, chunked: 'true' });

      // Should have made multiple POSTs.
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Each POST body has the chunked-title shape.
      for (const [, init] of mockFetch.mock.calls) {
        const body = JSON.parse(init.body);
        expect(body.title).toMatch(/^Big Plan \(Part \d+ of \d+\)$/);
        expect(body.description.length).toBeLessThanOrEqual(16_000);
      }

      // Final stdout has a summary object referencing all created plans.
      const out = JSON.parse(writeSpy.mock.calls[writeSpy.mock.calls.length - 1][0] as string);
      expect(out.chunked).toBe(true);
      expect(out.total_parts).toBe(mockFetch.mock.calls.length);
      expect(out.plans).toHaveLength(mockFetch.mock.calls.length);
    });

    it('writes a part-of-N footer into each chunk', async () => {
      const description = [
        makeSection('## Section 1', 8000),
        makeSection('## Section 2', 8000),
        makeSection('## Section 3', 8000),
      ].join('');

      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      let nextId = 100;
      const mockFetch = vi.fn().mockImplementation(async () =>
        mockOk({ id: nextId++, title: 'placeholder', project_id: 1 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      await createPlan({ name: 'Big Plan', description, chunked: 'true' });

      const total = mockFetch.mock.calls.length;
      for (let i = 0; i < total; i++) {
        const body = JSON.parse(mockFetch.mock.calls[i][1].body);
        expect(body.description).toContain(`Part ${i + 1} of ${total}`);
        expect(body.description).toContain('"Big Plan"');
      }
    });

    it('does not chunk content that fits in 16K even with --chunked set', async () => {
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const mockFetch = vi.fn().mockResolvedValue(mockOk({ id: 1, title: 'P', project_id: 1 }));
      vi.stubGlobal('fetch', mockFetch);

      await createPlan({ name: 'P', description: 'short', chunked: 'true' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.title).toBe('P'); // no "Part N of M" suffix
    });
  });
});

describe('splitAtSections (algorithm)', () => {
  it('returns the input as a single chunk when under the limit', () => {
    const text = '## A\nsmall\n## B\nstill small';
    expect(splitAtSections(text, 1000)).toEqual([text]);
  });

  it('splits at h2 boundaries when sections fit individually', () => {
    const text =
      '## Section A\n' +
      'x'.repeat(50) +
      '\n## Section B\n' +
      'y'.repeat(50) +
      '\n## Section C\n' +
      'z'.repeat(50);
    const chunks = splitAtSections(text, 80);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(80);
    // Each chunk should start with a section heading (or be a continuation
    // of the doc opening).
    expect(chunks[0]).toMatch(/^## /);
  });

  it('falls back to h3 boundaries when a single h2 exceeds the limit', () => {
    const text =
      '## Big Section\n' +
      '### Sub A\n' +
      'x'.repeat(40) +
      '\n### Sub B\n' +
      'y'.repeat(40) +
      '\n### Sub C\n' +
      'z'.repeat(40);
    const chunks = splitAtSections(text, 70);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(70);
  });

  it('falls back to line boundaries when even h3 sections are too big', () => {
    const text = '## Big\n' + ('line\n'.repeat(50));
    const chunks = splitAtSections(text, 30);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(30);
  });

  it('hard-slices a single line that exceeds the limit', () => {
    const text = 'x'.repeat(200);
    const chunks = splitAtSections(text, 50);
    expect(chunks.length).toBeGreaterThanOrEqual(4);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(50);
    // Concatenating chunks should reproduce the input verbatim.
    expect(chunks.join('')).toBe(text);
  });

  it('preserves the original content losslessly when concatenated', () => {
    const text =
      '## Section A\n' +
      'x'.repeat(50) +
      '\n## Section B\n' +
      'y'.repeat(50) +
      '\n## Section C\n' +
      'z'.repeat(50);
    const chunks = splitAtSections(text, 80);
    expect(chunks.join('')).toBe(text);
  });
});
