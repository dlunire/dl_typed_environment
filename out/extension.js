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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = deactivate;
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const description = {
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
const types = [
    'string',
    'integer',
    'float',
    'numeric',
    'boolean',
    'uuid',
    'email'
];
/**
 * Desactiva la extensión.
 * Se llama cuando la extensión es desactivada por VSCode.
 */
function deactivate() {
    console.log('DL Typed Environment Extension Deactivated');
}
/**
 * Activa la extensión DL Typed Environment.
 * Registra el autocompletado de tipos para variables cuando se detecta un ":".
 *
 * @param context Contexto de la extensión proporcionado por VSCode
 */
function activate(context) {
    /** Selector de lenguaje para la extensión */
    const selector = 'dlunire-envtype';
    /**
     * Proveedor de autocompletado
     */
    const providerParam = {
        /**
         * Proporciona los items de autocompletado.
         *
         * @param document Documento actual en el editor
         * @param position Posición del cursor en el documento
         * @returns Lista de sugerencias o undefined si no aplica
         */
        provideCompletionItems(document, position) {
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
    const chars = [":"];
    /** Registro del proveedor de autocompletado en VSCode */
    const provider = vscode.languages.registerCompletionItemProvider(selector, providerParam, ...chars);
    context.subscriptions.push(provider);
}
//# sourceMappingURL=extension.js.map