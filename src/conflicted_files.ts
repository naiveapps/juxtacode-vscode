'use strict';
import * as vscode from 'vscode';
import { GitExtension } from './api/git';
import { Repository } from './api/git';
import { Status } from './api/git';
import * as path from 'path';
import * as fs from 'fs';
import { Repositories } from './lib/Repositories';


const conflictStatuses = [
    Status.ADDED_BY_US,
	Status.ADDED_BY_THEM,
	Status.DELETED_BY_US,
	Status.DELETED_BY_THEM,
	Status.BOTH_ADDED,
	Status.BOTH_DELETED,
	Status.BOTH_MODIFIED
];

export class ConflictedFiles {
    private _subscriptions: vscode.Disposable[] = [];
    private _repoSubscriptions: vscode.Disposable[] = [];
    private _repositories: Repositories;

    private _conflictedFiles: string[] = [];

    private _conflictsEvent = new vscode.EventEmitter<any>();
    public readonly onDidChangeConflicts: vscode.Event<any> = this._conflictsEvent.event;

    constructor(repositories: Repositories) {
        this._repositories = repositories;

        this._setupSubscriptions();

        this._update();
    }

    dispose() {
        this._disposeSubscriptions();        
    }

    public get conflictedFiles(): string[] {
        return this._conflictedFiles;
    }

    public get hasRepository(): boolean {
        return this._getCurrentRepositoryPath() !== undefined;
    }

    private _disposeSubscriptions() {
		this._subscriptions.every(subscription => {
			subscription.dispose();
		});
		this._subscriptions = [];

        this._disposeRepoSubscriptions();
	}

    private _setupRepositories() {
		this._repositories.repositories.forEach(repo => {
			this._setupRepoSubscriptions(repo);
		});
	}

    private _setupRepoSubscriptions(repo: Repository) {
		this._repoSubscriptions.push(
			repo.state.onDidChange(() => {
				this._update();
			})
		);

		this._repoSubscriptions.push(
			repo.ui.onDidChange(() => {
				if (repo.ui.selected) {
					this._update();
				}
			})
		);
	}

    private _disposeRepoSubscriptions() {
		this._repoSubscriptions.every(subscription => {
			subscription.dispose();
		});
		this._repoSubscriptions = [];
	}

    private _setupSubscriptions() {
		if (this._subscriptions.length === 0) {
			this._subscriptions.push(vscode.window.onDidChangeActiveTextEditor(this._update, this));

			this._subscriptions.push(
				vscode.workspace.onDidChangeWorkspaceFolders(() => {
					this._disposeRepoSubscriptions();
					this._setupRepositories();
				})
			);

			this._subscriptions.push(
				this._repositories.onRepositoriesDidChange(() => {
					this._disposeRepoSubscriptions();
					this._setupRepositories();
				})
			);

			this._subscriptions.push(this._repositories.onDidInitialize(this._setupRepositories, this));
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

    private async _getConflictedFiles(): Promise<string[]> {
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')!.exports;
        const git = gitExtension.getAPI(1);
        const repositories = git.repositories.filter(repository => repository.rootUri.fsPath === this._getCurrentRepositoryPath());
        if (repositories.length > 0) {
            return repositories[0].state.mergeChanges.filter(change => conflictStatuses.includes(change.status)).map(change => change.uri.fsPath);
        }
        return [];
    }

    private async _update() {
        this._conflictedFiles = await this._getConflictedFiles();
        vscode.commands.executeCommand('setContext', 'juxtacode.conflictedFiles', this.conflictedFiles);
        this._conflictsEvent.fire(this.conflictedFiles);
    }
}