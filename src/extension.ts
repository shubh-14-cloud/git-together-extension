import * as vscode from 'vscode';
import axios from 'axios';
import { SidebarProvider } from './SidebarProvider';

// ⏱️ TRACK SESSION START (Reset when VS Code opens)
const sessionStart = Date.now();

export function activate(context: vscode.ExtensionContext) {
    // 1. Setup Sidebar
    const sidebarProvider = new SidebarProvider(context.extensionUri,context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("git-together-sidebar", sidebarProvider)
    );

    // 2. Status Bar Item (Shows current Room)
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "git-together.joinRoom";
    context.subscriptions.push(statusBarItem);

    // 3. Command: Set Username
    context.subscriptions.push(vscode.commands.registerCommand('git-together.setUsername', async () => {
        const username = await vscode.window.showInputBox({ prompt: "Enter your username to appear in the list" });
        if (username) {
            await context.globalState.update('git-together-username', username);
            vscode.window.showInformationMessage(`Logged in as: ${username}`);
            triggerPing(context); // Ping immediately
        }
    }));

    // 4. Command: Join Room (NEW!)
    context.subscriptions.push(vscode.commands.registerCommand('git-together.joinRoom', async () => {
        const room = await vscode.window.showInputBox({ 
            prompt: "Enter Room Name (e.g., 'Study-Group' or 'Global')", 
            placeHolder: "global" 
        });
        if (room) {
            await context.globalState.update('git-together-room', room); // Save room
            vscode.window.showInformationMessage(`Joined Room: ${room}`);
            sidebarProvider.refresh(); // Refresh sidebar
            triggerPing(context);      // Ping immediately
            updateStatusBar(context, statusBarItem);
        }
    }));

    // 5. Auto-Ping on Save
    vscode.workspace.onDidSaveTextDocument(() => {
        triggerPing(context);
    });

    // Initial Status Bar Update
    updateStatusBar(context, statusBarItem);
}

function updateStatusBar(context: vscode.ExtensionContext, item: vscode.StatusBarItem) {
    const room = context.globalState.get('git-together-room') || 'global';
    item.text = `$(organization) Git Together: ${room}`;
    item.show();
}

async function triggerPing(context: vscode.ExtensionContext) {
    const username = context.globalState.get('git-together-username');
    const room = context.globalState.get('git-together-room') || 'global'; // Default to global

    if (!username) return;

    const editor = vscode.window.activeTextEditor;
    const file = editor ? editor.document.fileName.split(/[\\/]/).pop() : "Idle";
    const language = editor ? editor.document.languageId : "None";

    // ⚠️ REPLACE WITH YOUR RENDER SERVER URL
    const SERVER_URL = 'https://git-together-server.onrender.com/ping';

    try {
        await axios.post(SERVER_URL, {
            username,
            file,
            language,
            room,            // Sending the Room
            sessionStart     // Sending the Time
        });
        console.log(`[Git Together] Ping sent for ${username} in room ${room}`);
    } catch (error) {
        console.error("Error sending ping:", error);
    }
}

export function deactivate() {}