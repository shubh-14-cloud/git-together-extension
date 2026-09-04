# Change Log

All notable changes to the "git-together-tracker" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.7]

- Added: room passcodes. When joining a brand-new room you can optionally set a passcode to lock it; the room list shows a 🔒 for locked rooms and prompts for the passcode when you pick one. `global` can never be locked, so there's always a public fallback.
- Passcodes are stored in VS Code's SecretStorage (not globalState), sent over HTTPS, and kept server-side as a salted SHA-256 hash — good enough to keep casual randoms out of a friend group's room, not a substitute for real auth.
- Added: a dedicated "Room Locked" screen in the sidebar (with an "Enter Passcode" button) when your stored passcode is missing or wrong, instead of a generic connection error.

## [0.0.6]

- Added: the sidebar now has its own "Set Username" / "Change" and room "Change" buttons at the top, so you no longer need the Command Palette to log in or switch rooms. Buttons trigger the same native input prompt as the commands (theme-aware, keyboard accessible).
- Added: a "Retry now" / "Set Username" button on the connection-error screen.

## [0.0.5]

- Fixed: room matching was case/whitespace-sensitive, so friends who typed "Global" vs "global" silently ended up in different rooms. Room names are now normalized (trimmed + lowercased) on both the extension and server.
- Added: idle indicator — friend cards show a green/gray dot based on how recently they pinged (idle after 2 minutes of inactivity).
- Added: click a friend's card to see session details (file, language, room, session length, last update) via `/rooms`-aware quick view.
- Added: **Git Together: Join Room** now shows a picker of currently active rooms (with headcounts) fetched from the server, plus an option to enter a custom room — fixes the silent-mismatch problem by letting you pick an existing room instead of retyping it.
- Added: best-effort presence cleanup — closing VS Code now tells the server to drop you immediately instead of leaving a stale "online" entry for up to 5 minutes.

## [0.0.4]

- Fixed: friend usernames/filenames/languages are now HTML-escaped before being rendered in the sidebar (XSS fix).
- Fixed: sidebar polling interval was never cleared, leaking timers; it now stops when the view is hidden or disposed and only polls while visible.
- Fixed: usernames/rooms are sanitized before being used as Firebase keys, so invalid characters no longer break pings.
- Added: manual "Git Together: Refresh" command (also available as a button in the sidebar title bar).
- Added: status bar warning color + tooltip when a ping fails to reach the server.
- Added: friendly hint in the sidebar when no username has been set yet.
- Changed: extension now activates on `onStartupFinished` instead of `*`.

## [0.0.1] - [0.0.3]

- Initial releases.