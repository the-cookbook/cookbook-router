export const HELP_TEXT = `cookbook-router <command> [options]

Commands:
  generate   Generate contracts.ts, register.d.ts, and manifest.json
  manifest   Generate manifest.json only
  validate   Validate route files without writing artifacts

Options:
  --routes <file>       Route source file. May be repeated.
  --out-dir <dir>       Generated output directory. Defaults to .cookbook-router
  --watch               Watch for files changes when used with generate
  -h, --help            Show help
  -v, --version         Show version`;
