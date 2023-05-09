'use strict';
import * as vscode from 'vscode';
import { API, APIState, GitExtension, Repository } from '../api/git';


export class Repositories {
	private _git: API;
	private _subscriptions: vscode.Disposable[] = [];
	private _initialized: boolean = false;

	private _initializedEvent = new vscode.EventEmitter<any>();
	public readonly onDidInitialize: vscode.Event<any> = this._initializedEvent.event;

	private _changedRepositoriesEvent = new vscode.EventEmitter<any>();
	public readonly onRepositoriesDidChange: vscode.Event<any> = this._changedRepositoriesEvent.event;

	constructor() {
		this._git = this._gitAPI;

		this._handleDidChangeState(this._git.state);
		this._setupSubscriptions();
	}

	private get _gitAPI(): API {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')!.exports;
		return gitExtension.getAPI(1);
	}

	disposeSubscriptions() {
		this._subscriptions.every(subscription => {
			subscription.dispose();
		});
		this._subscriptions = [];
	}

	private _setupSubscriptions() {
		if (this._subscriptions.length === 0) {
			this._subscriptions.push(this._git.onDidOpenRepository(this._handleOpenRepository, this));
			this._subscriptions.push(this._git.onDidChangeState(this._handleDidChangeState, this));
		}
	}

	private _handleOpenRepository(repo: Repository) {
		if (!this._initialized) { return; }

		if (this._initialized) {
			this._changedRepositoriesEvent.fire(true);
		}
	}

	private _handleDidChangeState(state: APIState) {
		if (state === 'initialized') {
			this._initialized = true;
			this._initializedEvent.fire(true);
		}
	}

	get repositories(): Repository[] {
		if (this._initialized) {
			return this._git.repositories;
		}

		return [];
	}

	repoForFile(fileUri: vscode.Uri): Repository | null {
		if (fileUri.scheme !== 'file') { return null; }

		const sortedRepos = this.sortedByPathDepth();
		const foundRepo = sortedRepos.find(
			repo => fileUri.toString().startsWith(repo.rootUri.toString())
		);

		return foundRepo || null;
	}

	sortedByPathDepth() {
		return this.repositories.sort(
			(a, b) => {
				return b.rootUri.path.length - a.rootUri.path.length;
			}
		);
	}
}