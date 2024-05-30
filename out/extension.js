"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const SMALLEST_HEXA_NUMBER = 0x00000000;
let decorationsArray = [];
let decorationType;
function activate(context) {
    console.log('Congratulations, your extension "smallest-hexa-finder" is now active!');
    let disposable = vscode.commands.registerCommand('smallest-hexa-finder.countAsserts', async () => {
        const config = vscode.workspace.getConfiguration('assertCounter');
        const searchStrings = config.get('searchStrings') || [];
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
        }
        else {
            vscode.window.showWarningMessage('No search string provided or invalid regular expression.');
        }
    });
    context.subscriptions.push(disposable);
    // TODO
    // Load the decoration style from configuration
    loadDecorationType();
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('assertCounter')) {
            loadDecorationType();
        }
    });
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
function validateRegex(searchString) {
    try {
        new RegExp(searchString);
        return true;
    }
    catch (e) {
        return false;
    }
}
function loadDecorationType() {
    const config = vscode.workspace.getConfiguration('assertCounter');
    const highlightColor = config.get('highlightColor', 'rgba(255, 255, 0, 0.3)');
    const highlightBorderColor = config.get('highlightBorderColor', '1px solid red');
    decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: highlightColor,
        border: highlightBorderColor
    });
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
async function countOccurrencesAndHighlight(searchString, progress) {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage('No folder or workspace opened');
        return;
    }
    let count = 0;
    let hexNumbers = [];
    const escapedSearchString = escapeRegExp(searchString);
    const hexPattern = new RegExp(`${escapedSearchString}\\s*\\(\\s*(0x[0-9A-Fa-f]+)\\s*`);
    const cppFiles = await vscode.workspace.findFiles('**/*.cpp', '**/node_modules/**');
    let processedFiles = 0;
    decorationsArray = [];
    let results = [];
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
                const inputString = line.trim();
                const regex = /(.*?)(0x[0-9A-Fa-f]+)(.*)/;
                const matchForColoredTableOutput = line.match(regex);
                if (matchForColoredTableOutput) {
                    results.push({
                        file: file.fsPath,
                        line: lineIndex + 1,
                        contentBeforeHex: matchForColoredTableOutput[1].trim(),
                        hex: matchForColoredTableOutput[2].trim(),
                        contentAfterHex: matchForColoredTableOutput[3].trim()
                    });
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
    }
    else {
        vscode.window.showInformationMessage(`No hex numbers found.`);
    }
}
function applyDecorations() {
    const editors = vscode.window.visibleTextEditors;
    for (const editor of editors) {
        editor.setDecorations(decorationType, decorationsArray);
    }
}
function showResultsInPanel(results) {
    const panel = vscode.window.createWebviewPanel('assertCounterResults', 'Results', vscode.ViewColumn.One, {});
    const htmlContent = generateResultsHtml(results);
    panel.webview.html = htmlContent;
}
function generateResultsHtml(results) {
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
        <title>Results</title>
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
        <h1>Results</h1>
        <table>
            <tr><th>File</th><th>Line</th><th>Content</th></tr>
            ${rows}
        </table>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                function highlightNumber() {
                    var cells = document.querySelectorAll('.cell-content');
                    cells.forEach(function(cell) {
                        var cellContent = cell.innerHTML;
                        var regex = /(0x[0-9A-Fa-f]+)/g;
                        cell.innerHTML = cellContent.replace(regex, '<span class="highlight">$1</span>');
                    });
                }
                highlightNumber();
            });
        </script>
    </body>
    </html>`;
}
function computeSmallestAvailableNumber(hexNumbers) {
    const hexaNumbersSet = new Set(hexNumbers);
    let smallestMissing = SMALLEST_HEXA_NUMBER;
    // Increment smallestMissing until we find a number not in the set
    while (hexaNumbersSet.has(smallestMissing)) {
        smallestMissing++;
    }
    return smallestMissing;
}
//# sourceMappingURL=extension.js.map