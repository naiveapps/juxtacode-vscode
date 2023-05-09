'use strict';
import * as vscode from 'vscode';
import { ConflictedFiles } from './conflicted_files';

export class StatusBar {
    private _statusBar: vscode.StatusBarItem;
    private _subscriptions: vscode.Disposable[] = [];
    private _conflictedFiles: ConflictedFiles;

    constructor(conflictedFiles: ConflictedFiles) {
        this._conflictedFiles = conflictedFiles;

        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        this._statusBar.command = 'juxtacode.openRepository';

        this._setupSubscriptions();

        this._update();
    }

    dispose() {
        this._disposeSubscriptions();        
        this._statusBar.dispose();
    }

    private _disposeSubscriptions() {
		this._subscriptions.every(subscription => {
			subscription.dispose();
		});
		this._subscriptions = [];
	}

    private _setupSubscriptions() {
		if (this._subscriptions.length === 0) {
			this._subscriptions.push(this._conflictedFiles.onDidChangeConflicts(this._update, this));
		}
	}

    private async _update() {
        let conflictedFiles = this._conflictedFiles.conflictedFiles;
        let conflictCount = conflictedFiles.length;
        if (conflictCount > 0) {
            this._statusBar.text = `▲ ${conflictCount}`;
            this._statusBar.tooltip = `${conflictCount} conflicted${conflictCount > 1 ? ' files' : ' file'}. Click to open JuxtaCode.`;
            this._statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this._statusBar.show();

        } else {
            this._statusBar.text = '▲';
            this._statusBar.backgroundColor = undefined;
            this._statusBar.tooltip = 'Open in JuxtaCode';
            if (this._conflictedFiles.hasRepository) {
                this._statusBar.show();
            } else {
                this._statusBar.hide();
            }
        }
    }
}