import * as vscode from 'vscode';

interface Types {
    string: string;
    integer: string;
    float: string;
    numeric: string;
    boolean: string;
    uuid: string;
    email: string;
}

const description: Types = {
    string: "Cadena de texto. Puede contener cualquier carácter.",
    integer: "Número entero, positivo o negativo, sin decimales.",
    float: "Número con punto flotante (decimales).",
    numeric: "Número genérico, puede ser entero o decimal.",
    boolean: "Valor lógico verdadero (`true`) o falso (`false`).",
    uuid: "Identificador Único Universal (UUID).",
    email: "Dirección de correo electrónico válida."
};


/**
 * Lista de tipos válidos para variables en DL Typed Environment
 */
const types: (keyof Types)[] = [
    'string',
    'integer',
    'float',
    'numeric',
    'boolean',
    'uuid',
    'email'
];

export type Provider = vscode.Disposable
export type Selector = vscode.DocumentSelector;
export type CompletionItemProvider = vscode.CompletionItemProvider;
export type Result = vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList>;

/**
 * Desactiva la extensión.
 * Se llama cuando la extensión es desactivada por VSCode.
 */
export function deactivate(): void {
    console.log('DL Typed Environment Extension Deactivated');
}

/**
 * Activa la extensión DL Typed Environment.
 * Registra el autocompletado de tipos para variables cuando se detecta un ":".
 *
 * @param context Contexto de la extensión proporcionado por VSCode
 */
export function activate(context: vscode.ExtensionContext): void {

    /** Selector de lenguaje para la extensión */
    const selector: string = 'dlunire-envtype';

    /**
     * Proveedor de autocompletado
     */
    const providerParam: CompletionItemProvider = {
        /**
         * Proporciona los items de autocompletado.
         *
         * @param document Documento actual en el editor
         * @param position Posición del cursor en el documento
         * @returns Lista de sugerencias o undefined si no aplica
         */
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Result {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);

            // Solo mostrar sugerencias si hay ":" en la línea (después del nombre de variable)
            if (!linePrefix.includes(':')) {
                return undefined;
            }

            return types.map(type => {
                const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.TypeParameter);
                item.detail = `Tipo primitivo: ${type}`;
                item.insertText = ` ${type} = `;

                if (type in description) {
                    item.documentation = new vscode.MarkdownString(description[type]);
                }

                return item;
            });
        }
    };

    /** Caracteres que desencadenan el autocompletado */
    const chars: string[] = [":"];

    /** Registro del proveedor de autocompletado en VSCode */
    const provider: Provider = vscode.languages.registerCompletionItemProvider(selector, providerParam, ...chars);
    context.subscriptions.push(provider);
}