# LyricGlow

A small always-on-top window that shows a live copy of Spotify's lyrics area, so you can keep
seeing the current line while you code. Nothing is downloaded or looked up: it just mirrors the
lyrics Spotify is already drawing. Fully local, no login, no internet.

## Run

```bash
npm install
npm start
```

## Build a macOS app

Build a DMG for the Mac architecture you are using:

```bash
npm run dist:mac
```

The installer is written to `dist/`. This local build is unsigned. macOS may warn before
opening it; public distribution without that warning requires Apple Developer ID signing
and notarization.

## Publish on GitHub

Push to `main` to build Apple-silicon and Intel DMGs. They appear as downloadable workflow
artifacts in the GitHub Actions run for 14 days; they are not public release downloads.

To publish permanent downloads, update the version in `package.json`, push the matching tag
(for example, `v0.1.0`), and the workflow will attach both DMGs to a GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Choose a license before making the repository public. Do not commit Apple signing certificates,
passwords, or notarization credentials. Store them as GitHub Actions secrets if you later
automate signed releases.


## One-time macOS permission

The first run needs **Screen Recording** permission:

System Settings → Privacy & Security → Screen Recording → enable **Terminal** (or iTerm / VS Code,
whichever you ran `npm start` from) → quit and start it again.

## Using it

1. Open Spotify, start a song, and open its **Lyrics** view. Keep the Spotify window open
   (not minimized). It can sit behind your editor or on another Space.
2. Press **⌘⇧R** and drag a box around the lyrics part of the Spotify window. Release, and the
   overlay now shows only that part, live.
3. Drag the overlay by its background to move it. Resize it from the edges.

| Shortcut | Action |
| --- | --- |
| ⌘⇧R | Select (or re-select) the lyrics region |
| ⌘⇧L | Show / hide the overlay |
| ⌘⇧K | Toggle click-through (mouse passes through to your editor) |
| ⌘⇧W | Pick a different window to mirror |

Your region and window choice are remembered between runs.

Use **Open at login** in the overlay controls to add or remove LyricGlow from your macOS Login
Items. Use the **×** control to quit the app.

## Troubleshooting

- **"Spotify window not found"**: Spotify must be open and not minimized. Press ⌘⇧W and pick it
  from the list.
- **Black or empty picture**: Screen Recording permission is missing, or the app was not restarted
  after granting it.
- **Overlay does not appear over a full-screen app**: it is set to float over full-screen Spaces,
  but if it still hides, press ⌘⇧L twice.
