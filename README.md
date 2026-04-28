## Sjung

Sjung is a Next.js app for choir administration and repertoire workflows.

## Development

Start the local development server:

```bash
npm run dev
```

## Testing Strategy

Unit tests in Sjung focus on deterministic logic first: pure helpers, parsing, transformations,
and domain rules that do not require network, database, or framework runtime.

- Test first: `lib/*` modules with pure or mostly pure logic.
- Prefer not mocking for unit tests; only mock when isolating unavoidable external boundaries.
- Keep tests co-located as `*.test.ts` next to the implementation file.
- Use the canonical CI/local command: `npm run test:unit`.
- Use watch mode while developing: `npm run test:unit:watch`.
