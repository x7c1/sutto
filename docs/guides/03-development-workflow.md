# Development Workflow

## Development Cycle

```bash
npm run dev
```

This command builds, copies files, and reloads the extension via D-Bus.

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Development build |
| `npm run build:release` | Release build (for distribution) |
| `npm run dev` | Build, copy, and reload extension |
| `npm run reload` | Reload extension via D-Bus |
| `npm run lint` | Run Biome linter |
| `npm run format` | Run Biome formatter |
| `npm run check` | Run both linter and formatter |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run site:dev` | Start local preview of the website |
| `npm run site:build` | Build the website for production |

## Viewing Logs

Monitor extension output in real-time:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

Filter for specific messages:

```bash
# Watch for reload events
journalctl -f -o cat /usr/bin/gnome-shell | grep -E "DBusReloader|Reloader"

# Check for errors
journalctl /usr/bin/gnome-shell | grep -i error
```
