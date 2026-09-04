# 🤝 Git Together: Real-Time Coding Companion

**Git Together** is a VS Code extension that brings the "study hall" vibe to remote development. It creates a live dashboard in your editor, showing which friends are online and what they're working on in real-time.

![Version](https://img.shields.io/badge/version-0.0.7-blue)
![Status](https://img.shields.io/badge/status-private%20beta-yellow)

## 🚀 Key Features

* **All in the Sidebar:** Set your username, join/create rooms, and refresh — all as buttons in the sidebar. No Command Palette required.
* **Real-Time Dashboard:** A custom sidebar view showing active peers, grouped by room.
* **Live Activity Tracking:** Automatically broadcasts your current file and language when you save.
* **Idle Indicator:** A green/gray dot shows who's actively coding vs. gone idle.
* **Click for Details:** Click a friend's card for their file, language, room, and session length.
* **Rooms with Discovery:** Join a named room (e.g. `study-group`) to only see people working with you — the join picker shows currently active rooms with headcounts, so you don't have to guess a name and risk a typo splitting the group.
* **Room Passcodes:** Optionally lock a room with a passcode when you create it, so it's not open to anyone who finds the room name. The default `global` room always stays public.
* **User Identity:** A lightweight username system to identify you across sessions.
* **Privacy-First:** You control when you're visible — updates only fire on file save, and only your filename/language are shared, never file contents. Closing VS Code removes your presence right away instead of lingering online.

## 🛠️ Tech Stack

* **Frontend:** TypeScript, VS Code Extension API.
* **Backend:** Node.js (Express), deployed on Render.
* **Database:** Google Firebase (Realtime Database).

## 📦 Installation (Private Beta)

1. Download the latest `.vsix` release.
2. In VS Code, go to **Extensions** > **...** > **Install from VSIX**.
3. Select the file and reload VS Code.
4. Open the Git Together sidebar (broadcast icon in the activity bar) and click **Set Username**.
5. (Optional) Click **Change** next to Room to join or create a room — pick from the active-room list or type a new name, with an option to lock it with a passcode.

## ⚠️ Known limitations

* The backend runs on Render's free tier, which spins down after inactivity — the first ping/refresh after a while can take up to a minute while it wakes up. If you see "Connection Error" in the sidebar, wait a moment or use the "Retry now" button.
* This is an MVP without user authentication — usernames are self-declared and not verified.
* Room passcodes are a light deterrent (salted hash, checked server-side), not real security — they keep casual randoms out of a room, not a determined attacker.

## 📄 License
This project is open source.
