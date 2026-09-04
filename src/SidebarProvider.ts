import * as vscode from 'vscode';
import axios from 'axios';
import * as crypto from 'crypto';
import { SERVER_URL, REQUEST_TIMEOUT_MS, PASSCODE_SECRET_KEY, escapeHtml } from './config';

const POLL_INTERVAL_MS = 5000;
const IDLE_AFTER_MS = 2 * 60 * 1000; // active -> idle after 2 minutes of no ping

interface Friend {
    username: string;
    file?: string;
    language?: string;
    room?: string;
    project?: string;
    sessionStart?: number;
    lastActive?: number;
}

function getNonce(): string {
    return crypto.randomBytes(16).toString('hex');
}

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    private _pollHandle?: ReturnType<typeof setInterval>;
    private _lastFriends: Friend[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message?.type) {
                case 'friendClick':
                    this._showFriendDetails(message.username);
                    break;
                case 'setUsername':
                    vscode.commands.executeCommand('git-together.setUsername');
                    break;
                case 'joinRoom':
                    vscode.commands.executeCommand('git-together.joinRoom');
                    break;
                case 'refresh':
                    vscode.commands.executeCommand('git-together.refresh');
                    break;
            }
        });

        this._updateWebview();
        this._startPolling();

        // Only poll while the sidebar is actually visible.
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._updateWebview();
                this._startPolling();
            } else {
                this._stopPolling();
            }
        });

        webviewView.onDidDispose(() => {
            this._stopPolling();
            this._view = undefined;
        });
    }

    public refresh() {
        this._updateWebview();
    }

    private _showFriendDetails(username: string) {
        const friend = this._lastFriends.find(f => f.username === username);
        if (!friend) return;

        const now = Date.now();
        const idleMinutes = friend.lastActive ? Math.floor((now - friend.lastActive) / 60000) : undefined;
        const startedMinutes = friend.sessionStart ? Math.max(0, Math.floor((now - friend.sessionStart) / 60000)) : undefined;

        const lines = [
            `File: ${friend.file || 'Idle'}`,
            `Language: ${friend.language || 'None'}`,
            `Room: ${friend.room || 'global'}`,
            startedMinutes !== undefined ? `Session length: ${startedMinutes}m` : undefined,
            idleMinutes !== undefined ? `Last update: ${idleMinutes === 0 ? 'just now' : `${idleMinutes}m ago`}` : undefined,
        ].filter(Boolean);

        vscode.window.showInformationMessage(`${friend.username} — ${lines.join(' · ')}`);
    }

    private _startPolling() {
        this._stopPolling();
        this._pollHandle = setInterval(() => this._updateWebview(), POLL_INTERVAL_MS);
    }

    private _stopPolling() {
        if (this._pollHandle) {
            clearInterval(this._pollHandle);
            this._pollHandle = undefined;
        }
    }

    private async _updateWebview() {
        if (!this._view) {
            return;
        }

        const currentRoom = (this._context.globalState.get('git-together-room') as string) || 'global';
        const username = this._context.globalState.get('git-together-username') as string | undefined;
        const passcode = await this._context.secrets.get(PASSCODE_SECRET_KEY);

        try {
            const response = await axios.get(`${SERVER_URL}/friends`, {
                params: { room: currentRoom, passcode },
                timeout: REQUEST_TIMEOUT_MS
            });
            const friends: Friend[] = Array.isArray(response.data) ? response.data : [];
            this._lastFriends = friends;
            this._view.webview.html = this._getHtmlForWebview(friends, currentRoom, username);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                this._view.webview.html = this._getLockedRoomHtml(currentRoom);
            } else {
                this._view.webview.html = this._getErrorHtml(username);
            }
        }
    }

    private _getHeaderHtml(roomName: string, username: string | undefined) {
        if (!username) {
            return `
                <div class="identity-card">
                    <div class="identity-row">👋 You haven't set a username yet.</div>
                    <button class="btn primary" data-action="setUsername">Set Username</button>
                </div>
            `;
        }

        return `
            <div class="identity-card">
                <div class="identity-row">
                    <span>Signed in as <b>${escapeHtml(username)}</b></span>
                    <button class="btn link" data-action="setUsername">Change</button>
                </div>
                <div class="identity-row">
                    <span>📍 Room: <b>${escapeHtml(roomName)}</b></span>
                    <button class="btn link" data-action="joinRoom">Change</button>
                </div>
            </div>
        `;
    }

    private _getHtmlForWebview(friends: Friend[], roomName: string, username: string | undefined) {
        const nonce = getNonce();
        const now = Date.now();

        const friendList = friends.map(friend => {
            const start = typeof friend.sessionStart === 'number' ? friend.sessionStart : now;
            const diffMinutes = Math.max(0, Math.floor((now - start) / 60000));

            let timeString = `${diffMinutes}m`;
            if (diffMinutes > 60) {
                timeString = `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
            }

            const lastActive = typeof friend.lastActive === 'number' ? friend.lastActive : now;
            const isIdle = (now - lastActive) > IDLE_AFTER_MS;
            const statusClass = isIdle ? 'idle' : 'active';
            const statusLabel = isIdle ? 'Idle' : 'Active';
            const usernameAttr = escapeHtml(friend.username);

            return `
                <div class="card" tabindex="0" role="button" data-username="${usernameAttr}" title="Click for details">
                    <div class="header">
                        <span class="name"><span class="dot ${statusClass}" title="${statusLabel}"></span>${escapeHtml(friend.username)}</span>
                        <span class="time">⏱️ ${timeString}</span>
                    </div>
                    <div class="details">
                        <span class="file">📄 ${escapeHtml(friend.file || 'Idle')}</span>
                        <span class="lang">${escapeHtml(friend.language || 'None')}</span>
                    </div>
                </div>
            `;
        }).join('');

        const header = this._getHeaderHtml(roomName, username);

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <style>
                    body { font-family: sans-serif; padding: 10px; color: #fff; }
                    h2 { font-size: 14px; margin-bottom: 10px; color: #ccc; text-transform: uppercase; }
                    .identity-card {
                        background: #252526;
                        border: 1px solid #3e3e42;
                        border-radius: 5px;
                        padding: 10px;
                        margin-bottom: 14px;
                        font-size: 0.85em;
                    }
                    .identity-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #cccccc; }
                    .identity-row + .identity-row { margin-top: 6px; }
                    .btn {
                        border: none;
                        border-radius: 3px;
                        padding: 4px 10px;
                        font-size: 0.85em;
                        cursor: pointer;
                        font-family: inherit;
                    }
                    .btn.primary {
                        background: var(--vscode-button-background, #4ec9b0);
                        color: var(--vscode-button-foreground, #1e1e1e);
                        margin-top: 8px;
                        width: 100%;
                    }
                    .btn.primary:hover { background: var(--vscode-button-hoverBackground, #4ec9b0); }
                    .btn.link {
                        background: transparent;
                        color: var(--vscode-textLink-foreground, #4ec9b0);
                        padding: 2px 4px;
                        text-decoration: underline;
                        flex-shrink: 0;
                    }
                    .card {
                        background: #252526;
                        border: 1px solid #3e3e42;
                        border-radius: 5px;
                        padding: 10px;
                        margin-bottom: 10px;
                        cursor: pointer;
                    }
                    .card:hover, .card:focus { border-color: #4ec9b0; outline: none; }
                    .header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; color: #4ec9b0; }
                    .name { display: flex; align-items: center; gap: 6px; }
                    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
                    .dot.active { background: #3fb950; }
                    .dot.idle { background: #8b8b8b; }
                    .time { font-size: 0.8em; color: #cccccc; }
                    .details { font-size: 0.9em; display: flex; flex-direction: column; }
                    .file { color: #ce9178; word-break: break-all; }
                    .lang { color: #569cd6; margin-top: 4px; font-size: 0.8em;}
                </style>
            </head>
            <body>
                ${header}
                <h2>Active Friends</h2>
                ${friendList || "<p style='color: #888;'>No one is here yet...</p>"}
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    document.querySelectorAll('.card').forEach((card) => {
                        const send = () => vscode.postMessage({ type: 'friendClick', username: card.dataset.username });
                        card.addEventListener('click', send);
                        card.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); send(); }
                        });
                    });
                    document.querySelectorAll('[data-action]').forEach((btn) => {
                        btn.addEventListener('click', () => vscode.postMessage({ type: btn.dataset.action }));
                    });
                </script>
            </body>
            </html>
        `;
    }

    private _getLockedRoomHtml(roomName: string) {
        const nonce = getNonce();
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <style>
                    body { font-family: sans-serif; padding: 10px; color: #fff; }
                    h3 { color: #e3b341; }
                    p { color: #cccccc; font-size: 0.9em; }
                    .btn {
                        border: none;
                        border-radius: 3px;
                        padding: 4px 10px;
                        font-size: 0.85em;
                        cursor: pointer;
                        font-family: inherit;
                        background: var(--vscode-button-background, #4ec9b0);
                        color: var(--vscode-button-foreground, #1e1e1e);
                    }
                </style>
            </head>
            <body>
                <h3>🔒 Room Locked</h3>
                <p>"${escapeHtml(roomName)}" needs a passcode you haven't entered (or entered incorrectly).</p>
                <button class="btn" data-action="joinRoom">Enter Passcode</button>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    document.querySelectorAll('[data-action]').forEach((btn) => {
                        btn.addEventListener('click', () => vscode.postMessage({ type: btn.dataset.action }));
                    });
                </script>
            </body>
            </html>
        `;
    }

    private _getErrorHtml(username?: string) {
        const nonce = getNonce();
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <style>
                    body { font-family: sans-serif; padding: 10px; color: #fff; }
                    h3 { color: #f48771; }
                    p { color: #cccccc; font-size: 0.9em; }
                    .btn {
                        border: none;
                        border-radius: 3px;
                        padding: 4px 10px;
                        font-size: 0.85em;
                        cursor: pointer;
                        font-family: inherit;
                        background: var(--vscode-button-background, #4ec9b0);
                        color: var(--vscode-button-foreground, #1e1e1e);
                    }
                </style>
            </head>
            <body>
                <h3>⚠️ Connection Error</h3>
                <p>Could not reach the server. It may be waking up from sleep (free hosting) — this can take up to a minute.</p>
                <p>Retrying automatically every few seconds.</p>
                ${!username ? '<button class="btn" data-action="setUsername">Set Username</button>' : ''}
                <button class="btn" data-action="refresh">Retry now</button>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    document.querySelectorAll('[data-action]').forEach((btn) => {
                        btn.addEventListener('click', () => vscode.postMessage({ type: btn.dataset.action }));
                    });
                </script>
            </body>
            </html>
        `;
    }
}
