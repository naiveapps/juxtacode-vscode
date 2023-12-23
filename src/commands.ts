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

            vscode.commands.registerCommand('juxtacode.mergeFile', (...resourceStates: [vscode.SourceControlResourceState | vscode.Uri]) => {
                for (let resourceState of resourceStates) {
                    let uri = resourceState instanceof vscode.Uri ? resourceState : resourceState.resourceUri;
                    if (uri && uri.fsPath) {
                        let filePath = uri.fsPath;
                        this._mergeFile(filePath);
                    }
                }
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

    private _mergeFile(filePath: string) {
        if (!this._checkForMacOS()) {
            return;
        }

        let repositoryPath = this._getCurrentRepositoryPath();
        if (repositoryPath) {
            const uri = 'https://ulinks.juxtacode.app/merge' + filePath + '?repo=' + repositoryPath + '&bundleID=com.microsoft.VSCode';
            const cmd = 'open -b com.naiveapps.juxtacode "' + encodeURI(uri) + '"';

            child_process.exec(cmd);
        }
    }
}