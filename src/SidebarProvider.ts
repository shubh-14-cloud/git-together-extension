import * as vscode from 'vscode';
import axios from 'axios';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;

    // We add 'context' here so we can read the saved Room Name
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

        this._updateWebview();

        // Auto-refresh every 5 seconds
        setInterval(() => {
            this._updateWebview();
        }, 5000);
    }

    public refresh() {
        this._updateWebview();
    }

    private async _updateWebview() {
        if (!this._view) {
            return;
        }

        // ⚠️ REPLACE THIS WITH YOUR ACTUAL RENDER URL
        const API_URL = "https://git-together-server.onrender.com"; 

        // 1. Get the current Room (Default to "global" if null)
        const currentRoom = this._context.globalState.get('git-together-room') || 'global';

        try {
            // 2. Fetch friends ONLY in this room
            const response = await axios.get(`${API_URL}/friends?room=${currentRoom}`);
            const friends = response.data;
            
            // 3. Render the HTML
            this._view.webview.html = this._getHtmlForWebview(friends, currentRoom as string);
        } catch (err) {
            this._view.webview.html = this._getErrorHtml();
        }
    }

    private _getHtmlForWebview(friends: any[], roomName: string) {
        // Create the list of cards
        const friendList = friends.map(friend => {
            // Calculate time online
            const now = Date.now();
            const start = friend.sessionStart || now; // handle missing start time
            const diffMinutes = Math.floor((now - start) / 60000);
            
            let timeString = `${diffMinutes}m`;
            if (diffMinutes > 60) {
                timeString = `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
            }

            return `
                <div class="card">
                    <div class="header">
                        <span class="name">${friend.username}</span>
                        <span class="time">⏱️ ${timeString}</span>
                    </div>
                    <div class="details">
                        <span class="file">📄 ${friend.file}</span>
                        <span class="lang">${friend.language}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Return the full HTML page
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    body { font-family: sans-serif; padding: 10px; color: #fff; }
                    h2 { font-size: 14px; margin-bottom: 10px; color: #ccc; text-transform: uppercase; }
                    .card { 
                        background: #252526; 
                        border: 1px solid #3e3e42; 
                        border-radius: 5px; 
                        padding: 10px; 
                        margin-bottom: 10px; 
                    }
                    .header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; color: #4ec9b0; }
                    .time { font-size: 0.8em; color: #cccccc; }
                    .details { font-size: 0.9em; display: flex; flex-direction: column; }
                    .file { color: #ce9178; word-break: break-all; }
                    .lang { color: #569cd6; margin-top: 4px; font-size: 0.8em;}
                </style>
            </head>
            <body>
                <h2>📍 Room: ${roomName}</h2>
                ${friendList || "<p style='color: #888;'>No one is here yet...</p>"}
            </body>
            </html>
        `;
    }

    private _getErrorHtml() {
        return `<h3>⚠️ Connection Error</h3><p>Could not reach server.</p>`;
    }
}