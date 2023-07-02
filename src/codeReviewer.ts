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

        const response = await this.getChatCompletion(`Responda com markdown o review do seguinte código: \n${this._code}`);
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

        fs.mkdir(tempDirectory, { recursive: true }, (err) => {
            if (err) {
                vscode.window.showWarningMessage('Erro ao criar o diretório temporário');
                console.error('Erro ao criar o diretório temporário:', err);
                return;
            }

            fs.writeFile(tempFilePath, response, (err) => {
                if (err) {
                    vscode.window.showWarningMessage('Erro ao gravar o arquivo temporário');
                    console.error('Erro ao gravar o arquivo temporário:', err);
                    return;
                }

                const uri = vscode.Uri.file(tempFilePath);
                vscode.window.showTextDocument(uri);
            });
        });
    }
}