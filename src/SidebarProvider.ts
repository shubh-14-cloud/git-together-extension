import * as vscode from 'vscode';
import * as https from 'https'; 

export class GitTogetherProvider implements vscode.TreeDataProvider<FriendItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FriendItem | undefined | null | void> = new vscode.EventEmitter<FriendItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FriendItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {
        setInterval(() => {
            this.refresh();
        }, 5000);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FriendItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FriendItem): Thenable<FriendItem[]> {
        return new Promise((resolve) => {
            if (element) {
                resolve([]);
                return;
            }

            
            const serverUrl = 'https:

            https.get(serverUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const friends = JSON.parse(data);
                        const items = friends.map((f: any) => {
                            return new FriendItem(
                                f.id, 
                                `${f.filename} (${f.language})`, 
                                vscode.TreeItemCollapsibleState.None
                            );
                        });
                        resolve(items);
                    } catch (e) {
                        resolve([]);
                    }
                });
            }).on('error', (err) => {
                console.error("Sidebar Error:", err);
                resolve([]);
            });
        });
    }
}

class FriendItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private details: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = this.details;
        this.description = this.details;
        this.iconPath = new vscode.ThemeIcon('account');
    }
}