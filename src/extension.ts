import * as vscode from 'vscode';
import * as https from 'https';
import { GitTogetherProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('✅ EXTENSION STARTED!');

    // 1. Register the Sidebar
    const sidebarProvider = new GitTogetherProvider();
    vscode.window.registerTreeDataProvider('gitTogetherFriends', sidebarProvider);

    // 2. Register the Login Command
    let loginCommand = vscode.commands.registerCommand('git-together.login', async () => {
        // THIS IS THE PART THAT OPENS THE BOX
        const username = await vscode.window.showInputBox({
            placeHolder: 'Enter your username (e.g., alex_dev)',
            prompt: 'Enter a unique name so friends can identify you!'
        });

        if (username) {
            await context.globalState.update('git_username', username);
            vscode.window.showInformationMessage(`✅ Logged in as: ${username}`);
        }
    });

    // 3. Register the Save Listener
    let saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
        console.log('📂 File Saved: ' + document.fileName);
        sendPing(document, context);
    });

    context.subscriptions.push(loginCommand);
    context.subscriptions.push(saveListener);
}

function sendPing(document: vscode.TextDocument, context: vscode.ExtensionContext) {
    // Get the saved name, or default to 'Anonymous'
    let userId = context.globalState.get<string>('git_username') || 'Anonymous';
    
    // Remove spaces from the name just in case
    userId = userId.replace(/\s/g, '_');

    const filename = document.fileName.split(/[\\/]/).pop();
    const language = document.languageId;
    
    const payload = JSON.stringify({
        userId: userId, 
        filename: filename,
        language: language,
        project: 'vscode-extension'
    });

    const options = {
        hostname: 'git-together-server.onrender.com', // Your Cloud URL
        port: 443, 
        path: '/ping',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    };

    const req = https.request(options, (res) => {});
    req.on('error', (error) => { console.error('Error sending ping:', error); });
    req.write(payload);
    req.end();
}

export function deactivate() {}  