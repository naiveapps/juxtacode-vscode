'use strict';
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class Commands {
    private _context: vscode.ExtensionContext;

    constructor(
		context: vscode.ExtensionContext,
	) {
		this._context = context;
	}

    init() {
		let openRepository = vscode.commands.registerCommand('juxtacode.openRepository', () => {
			this._openJuxtaCode();
		});

        let mergeFiles = vscode.commands.registerCommand('juxtacode.mergeFile', () => {
            this._mergeFile();
        });

        this._context.subscriptions.push(openRepository);
    }

    private _checkForMacOS(): boolean {
        if (process.platform === 'darwin') {
            return true;
        } else {
            vscode.window.showErrorMessage('JuxtaCode is only available on macOS.');
            return false;
        }
    }

    private _isGitRepository(workspace: vscode.WorkspaceFolder): boolean {
        const uri = workspace.uri;
        if (uri.scheme === 'file') {
          const folderPath = uri.fsPath;
          const gitFolderPath = path.join(folderPath, '.git');
          if (fs.existsSync(gitFolderPath)) {
            return true;
          }
        }
        return false;
    }

    private _getCurrentFilePath(): string | undefined {
        let currentDocument = vscode.window.activeTextEditor?.document;
        if (currentDocument) {
            let currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(currentDocument.uri);
            if (currentWorkspaceFolder && this._isGitRepository(currentWorkspaceFolder)) {
                return currentDocument.uri.fsPath;
            }
        }
        return undefined;
    }

    private _getCurrentRepositoryPath(): string | undefined {
        let currentDocument = vscode.window.activeTextEditor?.document;
        if (currentDocument) {
            let currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(currentDocument.uri);
            if (currentWorkspaceFolder && this._isGitRepository(currentWorkspaceFolder)) {
                return currentWorkspaceFolder.uri.fsPath;
            }
        }

        const workspaceFolders = vscode.workspace.workspaceFolders?.filter(this._isGitRepository);
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].uri.fsPath;
        }      
    }

    private _openJuxtaCode() {

        if (!this._checkForMacOS()) {
            return;
        }

        let repositoryPath = this._getCurrentRepositoryPath();
        if (repositoryPath) {
            
            const cmd = 'open -b com.naiveapps.juxtacode "' + repositoryPath + '"';

            child_process.exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    vscode.window.showErrorMessage('Could not open JuxtaCode.');
                }
            });

        } else {
            vscode.window.showErrorMessage('Could not determine the repository path for the current file.');
        }
    }

    private _mergeFile() {
        if (!this._checkForMacOS()) {
            return;
        }

        let repositoryPath = this._getCurrentRepositoryPath();
        let filePath = this._getCurrentFilePath();
        if (filePath && repositoryPath) {
            
            const cmd = 'open -b com.naiveapps.juxtacode.driver "' + repositoryPath + '"';
            child_process.exec(cmd);

            const script = 'tell application id "com.naiveapps.juxtacode"\n' +
            '  with timeout of 18000 seconds\n' +
            'merge "' + filePath + '" in "' + repositoryPath + '"\n' +
            '  end timeout\n' +
            'end tell';

            child_process.exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
                if (stderr) {
                    // Check error code in parens at end of first line
                    const match = stderr.match(/\((-?\d+)\)\s*$/m);
                    if (match && match.length > 1) {
                        const errorCode = match[1];
                        if (errorCode === '-1712') {
                            return; // Timed out. Do nothing.
                        }
                    }
                    vscode.window.showErrorMessage('Could not open JuxtaCode.');
                }

                const activateScript = 'tell application "Visual Studio Code" to activate';
                child_process.exec(`osascript -e '${activateScript}'`);
            });
        } else {
            vscode.window.showErrorMessage('Could not determine the repository path for the current file.');
        }
    }
}