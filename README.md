# 🤝 Git Together

**Git Together** is a VS Code extension that brings the "study hall" vibe to remote coding. It adds a sidebar to your editor that shows you exactly what files and languages your friends are working on in real-time.

![Version](https://img.shields.io/badge/version-0.0.2-blue)
![Status](https://img.shields.io/badge/status-active-success)

## 🚀 Features

* **Real-Time Dashboard:** See a list of active friends directly in your VS Code sidebar.
* **Live Status Updates:** Automatically updates your status (File Name & Language) whenever you save a file.
* **User Profiles:** Set a custom username so friends can identify you.
* **Cloud Powered:** Backend hosted on Render with a real-time Firebase database.

## 📦 How to Install

Since this extension is currently in **Private Beta** (not yet on the VS Code Marketplace), you can install it manually:

1.  Download the latest `.vsix` file from the [Releases] section (or ask the developer for the file).
2.  Open VS Code.
3.  Go to the **Extensions** tab (Square icon on the left).
4.  Click the **... (Three Dots)** menu at the top-right of the pane.
5.  Select **"Install from VSIX..."**
6.  Choose the `git-together-tracker-0.0.2.vsix` file.

## 🛠 Usage

### 1. Login
Once installed, you need to set your username so friends know who you are.
1.  Press `Ctrl + Shift + P` (Cmd + Shift + P on Mac).
2.  Type **"Git Together: Set Username"**.
3.  Enter your handle (e.g., `Alex_Dev`) and press Enter.

### 2. Start Coding
* The extension works automatically in the background.
* Whenever you **Save** a file (`Ctrl + S`), your status is broadcast to the server.
* Check the **Git Together** sidebar to see what your friends are working on!

## 🏗 Tech Stack

* **Frontend:** TypeScript, VS Code Extension API
* **Backend:** Node.js, Express
* **Database:** Google Firebase (Realtime Database)
* **Deployment:** Render (Cloud Hosting)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
