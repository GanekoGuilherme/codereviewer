import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const API_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const settings = vscode.workspace.getConfiguration('settings');

export class CodeReviewer {
    private _document!: vscode.TextDocument;
    private _code!: string;

    public async run() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this._document = editor.document;
            this._code = this._document.getText(editor.selection.isEmpty ? undefined : editor.selection);
        } else {
            vscode.window.showInformationMessage("Nenhum código selecionado.");
            return;
        }

        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: "Aguardando resposta...",
            cancellable: false
        };

        let response = await vscode.window.withProgress(progressOptions, async (_progress) => {
            return this.getChatCompletion(`Responda com um markdown o review do seguinte código: \n${this._code}`);
        });;

        await this.makeMarkdown(response);

    }

    private async getChatCompletion(content: string): Promise<string> {
        const API_KEY = settings.get('apiKey');

        if (!API_KEY) {
            vscode.window.showWarningMessage('Sua API KEY não foi configurada.');
            throw new Error('API KEY not found');
        }

        try {
            const response = await axios.post(API_BASE_URL, {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: 'system',
                        content: 'You are a senior programmer, who reviews code based on SOLID and clean code. Their reviews have the following topics, "Resumo e breve explicação", "Erros ou falhas", "Sugestões de melhorias" and "Padrões de projeto aplicados". At the end, a note from 0 to 5 is provided in the form of stars (⭐). Always answer in PT-BR.'
                    },
                    {
                        role: "user",
                        content
                    }
                ],
                temperature: 0.7,
            }, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            const completion = response.data.choices[0].message.content;
            return completion;
        } catch (error) {
            console.error('Erro na solicitação ao ChatGPT:', error);
            vscode.window.showWarningMessage('Erro na solicitação ao ChatGPT');
            throw error;
        }
    }

    private async makeMarkdown(response: string): Promise<void> {
        const tempFilename = 'tempfile.md';
        const tempDirectory = '/path/to/temp';

        const tempFilePath = path.join(tempDirectory, tempFilename);

        try {
            await fs.promises.mkdir(tempDirectory, { recursive: true });
            await fs.promises.writeFile(tempFilePath, response);
            const uri = vscode.Uri.file(tempFilePath);

            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand("workbench.action.files.revert", uri);
            await vscode.commands.executeCommand("markdown.showPreviewToSide");
        } catch (err) {
            vscode.window.showWarningMessage('Ocorreu um erro ao criar ou gravar o arquivo temporário.');
            console.error('Erro ao criar ou gravar o arquivo temporário:', err);
        }
    }
}