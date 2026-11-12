# Contributing

## Workflow

1. Create a branch from `main` (`feature/...`, `fix/...`).
2. Make the smallest change that solves the problem. Follow the existing
   structure (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
3. Add or update tests.
4. Run the checks below.
5. Open a pull request. CI must pass before merging.

## Checks before a pull request

```bash
pnpm lint
pnpm test
pnpm build
pnpm test:e2e   # for UI or auth flow changes
```

## Checklist

- [ ] Request input is validated (Zod schema in `backend/src/validators`)
- [ ] Errors use `AppError` with a stable `code`
- [ ] No secrets, tokens, or passwords in code, logs, or responses
- [ ] Ownership/role checks for any user-specific resource
- [ ] UI uses existing components and design tokens ([docs/DESIGN.md](docs/DESIGN.md))
- [ ] New images are SVG or AVIF/WebP (PNG only as a fallback)
- [ ] API contract changes are reflected in the frontend and docs
- [ ] New environment variables are documented in `.env.example`

## Dependencies

- pnpm only. Install a dependency in the package that uses it:
  `pnpm --filter <backend|frontend|e2e> add <package>` (add `-D` for dev).
- Check for an existing solution before adding a dependency.
- Commit `pnpm-lock.yaml`; never edit it by hand.
- New dependency build scripts are blocked by default. Allow one only if it
  is required, by adding it to `allowBuilds` in `pnpm-workspace.yaml`.

## Commit messages

Use short, imperative English messages, for example
`Add session revoke endpoint` or `Fix refresh race on page load`.

## AI agents

Agent rules live in `rules/`. `AGENTS.md` is generated: edit files in
`rules/always/` and run `pnpm rules:sync`.
