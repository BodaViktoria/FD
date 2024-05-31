# Smallest Hexadecimal Number Finder Extension

## Overview

The `smallest-hexa-finder` extension for Visual Studio Code is designed to scan C++ files and identify assert or xlog statements that contain hexadecimal numbers as parameters. These hexadecimal numbers must be unique within the entire project. The extension searches for these hexadecimal numbers, prints their range, identifies the smallest available number for use, and displays a detailed table showing the files and line numbers where each assert occurred.

## Features

- **Search and Identify**: Scan C++ files for assert or xlog statements with hexadecimal number parameters.
- **Ask for User Input**: The user can select in a dropdown list the argument type to look for (eg. assert or xlog).
<img width="614" alt="image" src="https://github.com/BodaViktoria/FD/assets/72062883/1b28c080-3b0f-48fc-9fbe-2f3e7a4a52f0">

- **Hexadecimal Validation**: Ensure that the hexadecimal numbers are unique within the project.
- **Range and Availability**: Display the range of found hexadecimal numbers and the smallest available number for use.
<img width="478" alt="image" src="https://github.com/BodaViktoria/FD/assets/72062883/980982ee-113d-4ff9-b843-89b4a5611512">

- **Progress Reporting**: Show progress during the scanning operation.
- **Results Panel**: Display results in an interactive webview panel, including a table of occurrences with file names and line numbers.
<img width="1093" alt="image" src="https://github.com/BodaViktoria/FD/assets/72062883/88a377a3-ea79-4b77-bb71-4a7cff05034b">


## Installation

1. Clone the repository or download the extension package.
2. Open the extension folder in Visual Studio Code.
3. Run `npm install` to install dependencies.
4. Press `F5` on Windows or `fn + F5` on Mac to open a new VS Code window with the extension loaded.

## Usage

### Activating the Extension

The extension is activated automatically upon opening Visual Studio Code. It registers a command `smallest-hexa-finder.countAsserts` which can be triggered via the command palette (`Ctrl+Shift+P`).

### Scanning for Asserts or Xlogs

1. Open the command palette (`Ctrl+Shift+P`).
2. Type and select `Smallest Hexa Number`.
<img width="614" alt="image" src="https://github.com/BodaViktoria/FD/assets/72062883/bbd9636d-49b0-495d-b78d-8ef9b3e9dc68">

4. Select or enter a string to search for (eg. assert or xlog).
5. The extension will scan for assert or xlog statements containing hexadecimal numbers in all `.cpp` files in the workspace.

### Results Panel

After scanning, a results panel will display:
- The range of found hexadecimal numbers.
- The smallest available hexadecimal number for use.
- A table with detailed information about each occurrence, including the file name and line number.

## Methods

- **activate(context: vscode.ExtensionContext)**

  - Activates the extension and registers the `countAsserts` command.

- **deactivate()**

  - Deactivates the extension.

- **validateRegex(searchString: string): boolean**

  - Validates if the provided search string is a valid regular expression.

- **loadDecorationType()**

  - Loads the decoration style from the configuration settings.

- **escapeRegExp(string: string): string**

  - Escapes special characters in a string to be used in a regular expression.

- **countOccurrences(searchString: string, progress: vscode.Progress): Promise<void>**

  - Counts occurrences of the specified assert or xlog statement and reports progress.

- **applyDecorations()**

  - Applies the decorations to all visible text editors.

- **showResultsInPanel(results: Result[]): void**

  - Displays the results in an interactive webview panel.

- **generateResultsHtml(results: Result[]): string**

  - Generates HTML content to display the results in the webview panel.

- **computeSmallestAvailableNumber(hexNumbers: number[]): number**

  - Computes the smallest available hexadecimal number not used in the found assert or xlog statements, separately.
