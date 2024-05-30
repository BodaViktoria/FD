import * as vscode from 'vscode';
import * as fs from 'fs';

const SMALLEST_HEXA_NUMBER = 0x00000000;

let decorationsArray: vscode.DecorationOptions[] = [];
let decorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "assert-counter" is now active!');

    let disposable = vscode.commands.registerCommand('assert-counter.countAsserts', async () => {
        const config = vscode.workspace.getConfiguration('assertCounter');
        const searchStrings: string[] = config.get('searchStrings') || [];

        const searchString = await vscode.window.showQuickPick(searchStrings, {
            placeHolder: "Select or enter a string to search for",
            ignoreFocusOut: true
        });

        if (searchString && validateRegex(searchString)) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Counting occurrences of '${searchString}'`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                await countOccurrencesAndHighlight(searchString, progress);
                progress.report({ increment: 100, message: 'Done' });
            });
        } else {
            vscode.window.showWarningMessage('No search string provided or invalid regular expression.');
        }
    });

    context.subscriptions.push(disposable);

    // Load the decoration style from configuration
    loadDecorationType();
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('assertCounter')) {
            loadDecorationType();
        }
    });
}

export function deactivate() {}

function validateRegex(searchString: string): boolean {
    try {
        new RegExp(searchString);
        return true;
    } catch (e) {
        return false;
    }
}

function loadDecorationType() {
    const config = vscode.workspace.getConfiguration('assertCounter');
    const highlightColor = config.get<string>('highlightColor', 'rgba(255, 255, 0, 0.3)');
    const highlightBorderColor = config.get<string>('highlightBorderColor', '1px solid red');

    decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: highlightColor,
        border: highlightBorderColor
    });
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

async function countOccurrencesAndHighlight(searchString: string, progress: vscode.Progress<{ message?: string, increment?: number }>) {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage('No folder or workspace opened');
        return;
    }

    let count = 0;
    let hexNumbers: number[] = [];
    const escapedSearchString = escapeRegExp(searchString);
    const hexPattern = new RegExp(`${escapedSearchString}\\s*\\(\\s*(0x[0-9A-Fa-f]+)\\s*`);

    const cppFiles = await vscode.workspace.findFiles('**/*.cpp', '**/node_modules/**');
    let processedFiles = 0;

    decorationsArray = [];
    let results: { file: string, line: number, contentBeforeHex: string, hex: string, contentAfterHex: string }[] = [];

    for (const file of cppFiles) {
        const content = await fs.promises.readFile(file.fsPath, 'utf8');
        const lines = content.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const match = line.match(hexPattern);
            if (match) {
                count++;
                const hexNumber = parseInt(match[1], 16);
                hexNumbers.push(hexNumber);

                // Highlight the assert statement
                const startPos = new vscode.Position(lineIndex, line.indexOf(match[0]));
                const endPos = new vscode.Position(lineIndex, line.indexOf(match[0]) + match[0].length);
                const decoration = { range: new vscode.Range(startPos, endPos) };
                decorationsArray.push(decoration);

                // Collect results
                
				console.log(line.trim());

				const inputString = line.trim();
				const regex = /(.*?)(0x[0-9A-Fa-f]+)(.*)/;

				const matcha = line.match(regex);
				console.log(matcha);
				if(matcha) {
					console.log(matcha[1]);
					results.push({ file: file.fsPath, line: lineIndex + 1, contentBeforeHex: matcha[1].trim(), hex: matcha[2].trim(), contentAfterHex: matcha[3].trim() });
				}
            }
        }

        // Update progress
        processedFiles++;
        progress.report({ increment: (processedFiles / cppFiles.length) * 100, message: `Processing file ${processedFiles}/${cppFiles.length}` });
    }

    applyDecorations();

    if (hexNumbers.length > 0) {
        const minHex = Math.min(...hexNumbers);
        const maxHex = Math.max(...hexNumbers);
        let smallestAvailableHex = computeSmallestAvailableNumber(hexNumbers);

        vscode.window.showInformationMessage(`Range of '${searchString}': 0x${minHex.toString(16)} to 0x${maxHex.toString(16)}`);
        vscode.window.showInformationMessage(`Smallest available number: 0x${smallestAvailableHex.toString(16)}`);

		// Show results in a panel
        showResultsInPanel(results);
    } else {
        vscode.window.showInformationMessage(`Total number of '${searchString}' in C++ files: ${count}\nNo hex numbers found.`);
    }
}

function applyDecorations() {
    const editors = vscode.window.visibleTextEditors;
    for (const editor of editors) {
        editor.setDecorations(decorationType, decorationsArray);
    }
}

function showResultsInPanel(results: { file: string, line: number, contentBeforeHex: string, hex: string, contentAfterHex: string }[]) {
    const panel = vscode.window.createWebviewPanel(
        'assertCounterResults',
        'Assert Counter Results',
        vscode.ViewColumn.One,
        {}
    );

    const htmlContent = generateResultsHtml(results);
    panel.webview.html = htmlContent;
}

function generateResultsHtml(results: { file: string, line: number, contentBeforeHex: string, hex: string, contentAfterHex: string }[]): string {
	let rows = '';
    for (const result of results) {
        rows += `<tr>
					<td>${result.file}</td>
					<td>${result.line}</td>
					<td class="cell-content">
						${result.contentBeforeHex} <span class="highlight" > ${result.hex} </span> ${result.contentAfterHex}
					</td>
				</tr>`;
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Assert Counter Results</title>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #f2f2f2; }
            .highlight {
                color: red;
            }
        </style>
    </head>
    <body>
        <h1>Assert Counter Results</h1>
        <table>
            <tr><th>File</th><th>Line</th><th>Content</th></tr>
            ${rows}
        </table>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Function to wrap the number with a span tag
                function highlightNumber() {
					console.log("?????");
                    var cells = document.querySelectorAll('.cell-content');
                    cells.forEach(function(cell) {
                        var cellContent = cell.innerHTML;
                        // Regular expression to match the number
                        var regex = /(0x[0-9A-Fa-f]+)/g;
                        cell.innerHTML = cellContent.replace(regex, '<span class="highlight">$1</span>');
                    });
                }

                // Call the function to highlight the number
                highlightNumber();
            });
        </script>
    </body>
    </html>`;
}

function computeSmallestAvailableNumber(hexNumbers: number[]) : number {
	const hexaNumbersSet = new Set(hexNumbers);	
	let smallestMissing = SMALLEST_HEXA_NUMBER;
	
	// Increment smallestMissing until we find a number not in the set
	while (hexaNumbersSet.has(smallestMissing)) {
		smallestMissing++;
	}
	return smallestMissing;
}