// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Repositories } from "./lib/Repositories";
import { ConflictedFiles } from './conflicted_files';
import { Commands } from './commands';
import { StatusBar } from './status_bar';

let repositories: Repositories;
let conflictedFiles: ConflictedFiles;
let statusBar: StatusBar;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	repositories = new Repositories();

	const commands = new Commands(context);
	commands.init();

	conflictedFiles = new ConflictedFiles(repositories);

	statusBar = new StatusBar(conflictedFiles);
	context.subscriptions.push(statusBar);
}

// This method is called when your extension is deactivated
export function deactivate() {}
