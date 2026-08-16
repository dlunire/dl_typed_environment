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
 * Expresión que reconoce un nombre de variable válido seguido de ':' y espacios opcionales.
 */
const VARIABLE_COLON_PATTERN = /^[A-Z]+(?:_[A-Z]+)*_*:\s*$/;
/**
 * Expresión para extraer componentes en la validación del Linter:
 * Grupo 1: Nombre de la variable
 * Grupo 2: Tipo declarado
 * Grupo 3: Valor (con o sin espacios, que luego será procesado)
 */
const VARIABLE_ASSIGNMENT_PATTERN = /^([A-Z]+(?:_[A-Z]+)*_*)\s*:\s*([a-z]+)\s*=\s*(.+)$/;
/**
 * Desactiva la extensión.
 */
function deactivate() {
    console.log('DL Typed Environment Extension Deactivated');
}
/**
 * Activa la extensión DL Typed Environment.
 * Registra autocompletado y linter semántico.
 */
function activate(context) {
    const selector = 'dlunire-envtype';
    // ==========================================
    // 1. PROVEEDOR DE AUTOCOMPLETADO
    // ==========================================
    const providerParam = {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            if (!VARIABLE_COLON_PATTERN.test(linePrefix)) {
                return undefined;
            }
            const needsLeadingSpace = !linePrefix.endsWith(' ');
            return types.map(type => {
                const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.TypeParameter);
                item.detail = `Tipo primitivo: ${type}`;
                item.insertText = `${needsLeadingSpace ? ' ' : ''}${type} = `;
                item.documentation = new vscode.MarkdownString(description[type]);
                return item;
            });
        }
    };
    const chars = [":"];
    const provider = vscode.languages.registerCompletionItemProvider(selector, providerParam, ...chars);
    context.subscriptions.push(provider);
    // ==========================================
    // 2. LINTER SEMÁNTICO (Diagnostics)
    // ==========================================
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(selector);
    context.subscriptions.push(diagnosticCollection);
    function updateDiagnostics(document) {
        if (document.languageId !== selector) {
            return;
        }
        const diagnostics = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const match = line.text.match(VARIABLE_ASSIGNMENT_PATTERN);
            if (match) {
                const declaredType = match[2];
                const rawValue = match[3].trim();
                // Eliminar posibles comentarios al final de la línea (# o //)
                let value = rawValue.split(/\s+(?:#|\/\/)/)[0].trim();
                let stringValue = value;
                // Remover comillas envolventes para evaluar strings puros (como uuid o email)
                if (/^["'].*["']$/.test(value)) {
                    stringValue = value.slice(1, -1);
                }
                // Ignorar evaluación si es una expresión (tiene operadores) o una referencia a otra variable
                if (/^[A-Z0-9_]+$/.test(value) || /[\+\-\*\/]/.test(value)) {
                    continue;
                }
                let isValid = true;
                switch (declaredType) {
                    case 'integer':
                        isValid = /^-?\d+$/.test(value);
                        break;
                    case 'float':
                        isValid = /^-?\d+\.\d+$/.test(value);
                        break;
                    case 'numeric':
                        isValid = /^-?\d+(\.\d+)?$/.test(value);
                        break;
                    case 'boolean':
                        isValid = /^(true|false)$/.test(value);
                        break;
                    case 'uuid':
                        isValid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(stringValue);
                        break;
                    case 'email':
                        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue);
                        break;
                    case 'string':
                        isValid = true; // Todo es válido como string léxicamente
                        break;
                }
                if (!isValid) {
                    // Calcular el rango para subrayar específicamente el valor erróneo
                    const startIndex = line.text.lastIndexOf(rawValue);
                    const range = new vscode.Range(i, startIndex, i, startIndex + rawValue.length);
                    const diagnostic = new vscode.Diagnostic(range, `Error semántico: El valor asignado no corresponde con el tipo declarado '${declaredType}'.`, vscode.DiagnosticSeverity.Error);
                    diagnostics.push(diagnostic);
                }
            }
        }
        diagnosticCollection.set(document.uri, diagnostics);
    }
    // Actualizar linter mientras se escribe
    vscode.workspace.onDidChangeTextDocument(event => {
        updateDiagnostics(event.document);
    }, null, context.subscriptions);
    // Actualizar linter al cambiar de archivo activo
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDiagnostics(editor.document);
        }
    }, null, context.subscriptions);
    // Ejecución inicial al activar la extensión
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }
}
//# sourceMappingURL=extension.js.map