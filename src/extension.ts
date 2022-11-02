// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs'
import * as path from 'path';
import * as _ from 'lodash/fp';

interface WSConfig {
	name: string;
	includePath: string[];
	defines: string[];
	windowsSdkVersion: string;
	compilerPath: string;
	cStandard: string;
	cppStandard: string;
	intelliSenseMode: string;
}
interface WSCpp {
	configurations?: WSConfig[];
	version: number;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "conan-read-cmake-paths" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('conan-read-cmake-paths.helloSteve', () => { // FIXME change commmand name to something sensible
		vscode.workspace.workspaceFolders?.map(dir => dir.uri.fsPath).map(wspath => {
			const includes_path = path.join(wspath, "/.vscode/c_cpp_properties.json");
			if (!fs.existsSync(includes_path)) {
				vscode.window.showErrorMessage("file .vscode/c_cpp_properties.json does not exist (click edit json file to create it)");
				return;
			}
			let input_includes: WSCpp = JSON.parse(fs.readFileSync(includes_path, { encoding: "utf-8" }));

			const conan_paths_file = path.join(wspath, "/build/conanbuildinfo.txt");
			if (!fs.existsSync(conan_paths_file)) {
				vscode.window.showErrorMessage("Conan paths file does not exist " + path.relative(wspath, conan_paths_file));
				return;
			}
			const txt = fs.readFileSync(conan_paths_file, { encoding: "utf-8" });

			const header_text = "[includedirs]";
			const beg = txt.indexOf(header_text);
			if (beg === -1) {
				vscode.window.showWarningMessage("Could not find any include dirs");
				return;
			}

			const txt_lines = new Set(_.takeWhile(s => !s.startsWith('['), _.drop(1, txt.substring(beg).split(/\r?\n|\r|\n/g)).map(s => s.trim()).filter(s => s.length !== 0)));
			vscode.window.showInformationMessage("conan includes found " + txt_lines.size);

			if (input_includes.configurations === undefined || input_includes.configurations.length === 0) {
				vscode.window.showErrorMessage("Workspace file does not contain any configurations");
				return;
			}

			const config_by_name = _.keyBy("name", input_includes.configurations);
			_.get
			const configuration_option = input_includes.configurations.map(c => c.name);
			vscode.window.showQuickPick(configuration_option, { canPickMany: true, placeHolder: "Select which profile to alter", title: "Alter profile" }).then(
				picked => {
					let changesMade = false;
					picked?.forEach(name => {
						const ws_config = config_by_name[name];

						const new_ws_includes = setDiff(txt_lines, new Set(ws_config.includePath));
						if (new_ws_includes.size !== 0) {
							vscode.window.showInformationMessage(`adding to config ${ws_config.name} ${new_ws_includes.size} lines`);
							changesMade = true;
							ws_config.includePath.push(...new_ws_includes);
						}
					});
					if (changesMade) {
						fs.writeFileSync(includes_path, JSON.stringify(input_includes, undefined, 4), { encoding: "utf-8" });
					}
					vscode.window.showInformationMessage(changesMade ? "Written changes to file" : "File is already up to date with all include paths");
				}
			);
		}
		);
	});

	context.subscriptions.push(disposable);
}

function setDiff<T>(a: Set<T> | Array<T>, b: Set<T>) {
	return new Set(Array.from(a).filter(e => !b.has(e)));
}

// This method is called when your extension is deactivated
export function deactivate() { }
