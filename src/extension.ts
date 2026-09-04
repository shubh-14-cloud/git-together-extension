import * as vscode from 'vscode';
import axios from 'axios';
import { SidebarProvider } from './SidebarProvider';
import { SERVER_URL, REQUEST_TIMEOUT_MS, PASSCODE_SECRET_KEY, sanitizeUsername, sanitizeRoom } from './config';

// ⏱️ TRACK SESSION START (Reset when VS Code opens)
const sessionStart = Date.now();

// Kept for best-effort presence cleanup in deactivate() below.
let extContext: vscode.ExtensionContext | undefined;

export function activate(context: vscode.ExtensionContext) {
    extContext = context;

    // 1. Setup Sidebar
    const sidebarProvider = new SidebarProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("git-together-sidebar", sidebarProvider)
    );

    // 2. Status Bar Item (Shows current Room)
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "git-together.joinRoom";
    context.subscriptions.push(statusBarItem);

    // 3. Command: Set Username
    context.subscriptions.push(vscode.commands.registerCommand('git-together.setUsername', async () => {
        const username = await vscode.window.showInputBox({
            prompt: "Enter your username to appear in the list",
            validateInput: (value) => value.trim().length === 0 ? "Username cannot be empty" : undefined
        });
        if (username) {
            const clean = sanitizeUsername(username);
            await context.globalState.update('git-together-username', clean);
            vscode.window.showInformationMessage(`Logged in as: ${clean}`);
            sidebarProvider.refresh();
            triggerPing(context, statusBarItem);
        }
    }));

    // 4. Command: Join Room (with room discovery/autocomplete + passcode support)
    context.subscriptions.push(vscode.commands.registerCommand('git-together.joinRoom', async () => {
        const CUSTOM_ITEM = '$(plus) Enter a custom room name…';
        type RoomItem = vscode.QuickPickItem & { roomValue?: string; locked?: boolean };
        const items: RoomItem[] = [];

        try {
            const response = await axios.get<{ room: string; count: number; locked?: boolean }[]>(`${SERVER_URL}/rooms`, {
                timeout: REQUEST_TIMEOUT_MS
            });
            for (const { room, count, locked } of response.data) {
                items.push({
                    label: `${locked ? '$(lock) ' : ''}${room}`,
                    description: `${count} online${locked ? ' · locked' : ''}`,
                    roomValue: room,
                    locked: !!locked
                });
            }
        } catch (err) {
            console.error('[Git Together] Failed to fetch room list:', err);
        }

        items.push({ label: CUSTOM_ITEM });

        const picked = items.length > 1
            ? await vscode.window.showQuickPick(items, { placeHolder: "Pick an active room, or enter a new one" })
            : { label: CUSTOM_ITEM } as RoomItem;

        if (!picked) return;

        const isCustom = !picked.roomValue;
        let room: string | undefined = picked.roomValue;
        if (isCustom) {
            room = await vscode.window.showInputBox({
                prompt: "Enter Room Name (e.g., 'study-group')",
                placeHolder: "global"
            });
        }

        if (!room) return;
        const clean = sanitizeRoom(room);

        let passcode: string | undefined;
        if (picked.locked) {
            // Joining a room someone already locked — ask for the passcode.
            passcode = await vscode.window.showInputBox({
                prompt: `Room "${clean}" is locked — enter its passcode`,
                password: true
            });
            if (passcode === undefined) return; // user cancelled
        } else if (isCustom && clean !== 'global') {
            // Creating/joining a fresh room — offer to lock it.
            passcode = await vscode.window.showInputBox({
                prompt: `Optional: set a passcode to lock "${clean}" (leave blank for a public room)`,
                password: true
            });
        }

        if (passcode) {
            await context.secrets.store(PASSCODE_SECRET_KEY, passcode);
        } else {
            await context.secrets.delete(PASSCODE_SECRET_KEY);
        }

        await context.globalState.update('git-together-room', clean);
        sidebarProvider.refresh();
        updateStatusBar(context, statusBarItem);

        const pinged = await triggerPing(context, statusBarItem);
        if (pinged) {
            vscode.window.showInformationMessage(`Joined Room: ${clean}`);
        }
    }));

    // 5. Command: Refresh (manual retry, e.g. after the server wakes up)
    context.subscriptions.push(vscode.commands.registerCommand('git-together.refresh', () => {
        sidebarProvider.refresh();
        triggerPing(context, statusBarItem);
    }));

    // 6. Auto-Ping on Save
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
        triggerPing(context, statusBarItem);
    }));

    // Initial Status Bar Update
    updateStatusBar(context, statusBarItem);
    if (context.globalState.get('git-together-username')) {
        triggerPing(context, statusBarItem);
    }
}

function updateStatusBar(context: vscode.ExtensionContext, item: vscode.StatusBarItem) {
    const room = context.globalState.get('git-together-room') || 'global';
    const username = context.globalState.get('git-together-username');
    item.text = `$(organization) Git Together: ${room}`;
    item.tooltip = username
        ? `Logged in as ${username} · Click to change room`
        : `Run "Git Together: Set Username" to join`;
    item.show();
}

/** Returns true if the ping succeeded. */
async function triggerPing(context: vscode.ExtensionContext, statusBarItem?: vscode.StatusBarItem): Promise<boolean> {
    const username = context.globalState.get('git-together-username');
    const room = context.globalState.get('git-together-room') || 'global';

    if (!username) return false;

    const editor = vscode.window.activeTextEditor;
    const file = editor ? editor.document.fileName.split(/[\\/]/).pop() : "Idle";
    const language = editor ? editor.document.languageId : "None";
    const passcode = await context.secrets.get(PASSCODE_SECRET_KEY);

    try {
        await axios.post(`${SERVER_URL}/ping`, {
            username,
            file,
            language,
            room,
            sessionStart,
            passcode
        }, { timeout: REQUEST_TIMEOUT_MS });
        console.log(`[Git Together] Ping sent for ${username} in room ${room}`);
        if (statusBarItem) {
            statusBarItem.backgroundColor = undefined;
            statusBarItem.tooltip = `Logged in as ${username} · Click to change room`;
        }
        return true;
    } catch (error) {
        console.error("[Git Together] Error sending ping:", error);
        if (statusBarItem) {
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                statusBarItem.tooltip = "Git Together: wrong or missing passcode for this room";
                vscode.window.showErrorMessage(`Git Together: incorrect passcode for room "${room}".`);
            } else {
                statusBarItem.tooltip = "Git Together: couldn't reach the server (it may be waking up)";
            }
        }
        return false;
    }
}

// Best-effort: tell the server to drop us immediately instead of leaving a
// stale "online" entry around for up to 5 minutes. VS Code gives deactivate()
// a limited window to run, so this is fire-with-a-short-timeout, not guaranteed.
export async function deactivate() {
    const username = extContext?.globalState.get('git-together-username');
    if (!username) return;

    try {
        await axios.post(`${SERVER_URL}/offline`, { username }, { timeout: 2000 });
    } catch (err) {
        console.error('[Git Together] Failed to mark offline on deactivate:', err);
    }
}
