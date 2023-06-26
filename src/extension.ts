import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const API_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const settings = vscode.workspace.getConfiguration('settings');

async function getChatCompletion(content: string): Promise<string> {
	const API_KEY = settings.get('apiKey');
	console.log('api: ', API_KEY);
	if(!API_KEY){
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
		console.log('response: ', response.data.choices[0]);
		const completion = response.data.choices[0].message.content;
		return completion;
		} catch (error) {
		console.error('Erro na solicitação ao ChatGPT:', error);
		vscode.window.showWarningMessage('Erro na solicitação ao ChatGPT');
		throw error;
		}
  }

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "codereviewer" is now active! code-review.start');

	let disposable = vscode.commands.registerCommand('code-review.start', () => {
        const activeEditor = vscode.window.activeTextEditor;
        const workspacePath = vscode.workspace.rootPath;

        let baseDirectory = workspacePath;

        if (activeEditor && activeEditor.document) {
            const activeFilePath = activeEditor.document.uri.fsPath;
            baseDirectory = path.dirname(activeFilePath);
        }

        vscode.window.showInputBox({ prompt: 'Digite o nome do arquivo:' })
            .then(fileName => {
                if (fileName) {
					if(baseDirectory){
						const matchingFiles = recursiveFileSearch(baseDirectory, fileName);

						if (matchingFiles.length > 0) {
							for (const file of matchingFiles) {
								const fileString = fs.readFileSync(file, 'utf-8');
								
								getChatCompletion(`Responda com o markdown o review do seguinte código: \n${fileString}`).then(resp => {
									const tempFilename = 'tempfile.md';
									const tempDirectory = '/path/to/temp';

									const tempFilePath = path.join(tempDirectory, tempFilename);

									fs.mkdir(tempDirectory, { recursive: true }, (err) => {
										if (err) {
										  vscode.window.showWarningMessage('Erro ao criar o diretório temporário');
										  console.error('Erro ao criar o diretório temporário:', err);
										  return;
										}
									  
										fs.writeFile(tempFilePath, resp, (err) => {
										  if (err) {
											vscode.window.showWarningMessage('Erro ao gravar o arquivo temporário');
											console.error('Erro ao gravar o arquivo temporário:', err);
											return;
										  }
									  
										  const uri = vscode.Uri.file(tempFilePath);
										  vscode.window.showTextDocument(uri);
										});
									  });
								});
								
							}
						} else {
							vscode.window.showWarningMessage(`Nenhum arquivo encontrado com o nome: ${fileName}`);
							console.log('Nenhum arquivo encontrado com o nome:', fileName);
						}
					} else{
						console.log('BaseDirectory não encontrado: ', baseDirectory);
					}
                }
            });
    });

    context.subscriptions.push(disposable);
}



function recursiveFileSearch(directory: string, fileName: string): string[] {
    let matches: string[] = [];

    if (!fs.existsSync(directory)) {
        return matches;
    }

    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const fileStat = fs.statSync(filePath);

        if (fileStat.isDirectory()) {
            const nestedMatches = recursiveFileSearch(filePath, fileName);
            matches = matches.concat(nestedMatches);
        } else if (file === fileName) {
            matches.push(filePath);
        }
    }

    return matches;
}