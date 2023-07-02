import * as vscode from 'vscode';
import { CodeReviewer } from './codeReviewer';


export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "codereviewer" is now active! code-review.start');
    const codeReviewer = new CodeReviewer();

    let disposable = vscode.commands.registerCommand('code-review.start', () => {
        codeReviewer.run();
    });

    context.subscriptions.push(disposable);
}