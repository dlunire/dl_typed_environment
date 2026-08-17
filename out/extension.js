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
    string: "Cadena de texto. Debe estar delimitada por comillas simples, dobles o backticks.",
    integer: "Número entero, positivo o negativo, sin decimales.",
    float: "Número con punto flotante (decimales).",
    numeric: "Número genérico, puede ser entero o decimal.",
    boolean: "Valor lógico verdadero (`true`) o falso (`false`).",
    uuid: "Identificador Único Universal (UUID). Se escribe SIN comillas.",
    email: "Dirección de correo electrónico válida. Se escribe SIN comillas."
};
const types = ['string', 'integer', 'float', 'numeric', 'boolean', 'uuid', 'email'];
// Tipos que aceptan operaciones aritméticas
const NUMERIC_TYPES = new Set(['integer', 'float', 'numeric']);
// Compatibilidad de asignación por referencia: destino -> orígenes aceptables
const ASSIGNABLE = {
    string: new Set(['string']),
    integer: new Set(['integer']),
    float: new Set(['float', 'integer']), // un integer puede promoverse a float
    numeric: new Set(['numeric', 'integer', 'float']),
    boolean: new Set(['boolean']),
    uuid: new Set(['uuid']),
    email: new Set(['email'])
};
const LANGUAGE_ID = 'dlunire-envtype';
const VARIABLE_COLON_PATTERN = /^[A-Z]+(?:_[A-Z]+)*_*:\s*$/;
const VAR_NAME_PATTERN = /^[A-Z]+(?:_[A-Z]+)*_*$/;
/** Igual que VAR_NAME_PATTERN pero sin anclas, para usar con getWordRangeAtPosition. */
const VAR_WORD_PATTERN = /[A-Z]+(?:_[A-Z]+)*_*/;
/** Reconoce la línea de declaración de una variable, para localizarla desde el hover. */
const DECLARATION_LINE_PATTERN = /^\s*([A-Z]+(?:_[A-Z]+)*_*)\s*:\s*(string|integer|float|numeric|boolean|uuid|email)\b/;
const ARITHMETIC_EXPRESSION_PATTERN = /^-?(?:\d+(?:\.\d+)?|[A-Z]+(?:_[A-Z]+)*_*)(?:\s*[+\-*/]\s*-?(?:\d+(?:\.\d+)?|[A-Z]+(?:_[A-Z]+)*_*))+$/;
const COMPARISON_EXPRESSION_PATTERN = /^-?(?:\d+(?:\.\d+)?|[A-Z]+(?:_[A-Z]+)*_*)\s*(?:<|>)\s*-?(?:\d+(?:\.\d+)?|[A-Z]+(?:_[A-Z]+)*_*)$/;
function deactivate() {
    console.log('DL Typed Environment Extension Deactivated');
}
/**
 * Reemplaza el contenido de los comentarios de bloque (/* ... *\/ y /** ... *\/)
 * por espacios en blanco, preservando saltos de línea y todas las posiciones de
 * columna. Así el resto del pipeline (parseLine, diagnósticos) no necesita saber
 * nada sobre comentarios de bloque -- para él, simplemente no existen -- pero
 * los rangos de error siguen apuntando exactamente donde correspondía en el
 * archivo original. Esto también resuelve el caso de comentario y código en la
 * misma línea (ej. "/* nota *\/ DAVID: string = \"x\"").
 */
function stripBlockComments(text) {
    let result = '';
    let i = 0;
    let insideBlock = false;
    while (i < text.length) {
        const c = text[i];
        const next = text[i + 1];
        if (!insideBlock && c === '/' && next === '*') {
            insideBlock = true;
            result += '  ';
            i += 2;
            continue;
        }
        if (insideBlock) {
            if (c === '*' && next === '/') {
                insideBlock = false;
                result += '  ';
                i += 2;
                continue;
            }
            result += (c === '\n') ? '\n' : ' ';
            i++;
            continue;
        }
        result += c;
        i++;
    }
    return result;
}
/**
 * Busca un bloque de documentación estilo JSDoc/PHPDocumentor (doble asterisco:
 * "/** ... *\/") inmediatamente encima de la línea de declaración indicada.
 * Un comentario de un solo asterisco ("/* ... *\/") NO cuenta como documentación,
 * igual que en JSDoc: solo "/**" activa la extracción.
 *
 * @param document Documento actual
 * @param declarationLine Índice (0-based) de la línea donde está la declaración
 * @returns El texto documentado, o undefined si no hay un bloque JSDoc justo encima
 */
function extractJsDocAbove(document, declarationLine) {
    const end = declarationLine - 1;
    if (end < 0)
        return undefined;
    const endLineText = document.lineAt(end).text.trim();
    if (!endLineText.endsWith('*/'))
        return undefined;
    let start = end;
    while (start >= 0) {
        const text = document.lineAt(start).text.trim();
        if (text.startsWith('/**'))
            break;
        if (!text.startsWith('*') && !text.endsWith('*/'))
            return undefined; // no era un bloque contiguo
        start--;
    }
    if (start < 0 || !document.lineAt(start).text.trim().startsWith('/**')) {
        return undefined; // era un /* normal, sin doble asterisco: no se documenta
    }
    const paragraphs = [];
    let current = [];
    for (let i = start; i <= end; i++) {
        let text = document.lineAt(i).text.trim();
        text = text.replace(/^\/\*\*/, '').replace(/\*\/$/, '').replace(/^\*/, '').trim();
        if (text.length === 0) {
            // Línea de asterisco vacía dentro del bloque: cierra el párrafo
            // actual. Esto es lo único que produce un salto de línea real.
            if (current.length > 0) {
                paragraphs.push(current.join(' '));
                current = [];
            }
            continue;
        }
        // Líneas consecutivas con contenido se consideran la misma oración/
        // párrafo partida por comodidad de escritura, no un salto de línea.
        current.push(text);
    }
    if (current.length > 0) {
        paragraphs.push(current.join(' '));
    }
    return paragraphs.length > 0 ? paragraphs.join('\n\n') : undefined;
}
/**
 * Normaliza el espaciado de cada línea de declaración a exactamente:
 * NOMBRE: tipo = valor
 * Reutiliza parseLine (el mismo autómata del linter) para no reinventar el
 * reconocimiento de la estructura, y stripBlockComments para no confundirse
 * con comentarios de bloque al calcular columnas. Las líneas vacías, los
 * comentarios de línea completa y las líneas con errores estructurales no
 * se tocan -- no tiene sentido reformatear algo que ni siquiera es válido.
 *
 * @param document Documento a formatear
 * @returns Lista de ediciones para "Format Document"
 */
function formatDocument(document) {
    const edits = [];
    const cleanedLines = stripBlockComments(document.getText()).split(/\r\n|\r|\n/);
    for (let i = 0; i < document.lineCount; i++) {
        const originalLine = document.lineAt(i);
        const raw = cleanedLines[i] !== undefined ? cleanedLines[i] : originalLine.text;
        const trimmed = raw.trim();
        if (trimmed.length === 0 || trimmed.startsWith('#') || trimmed.startsWith('//')) {
            continue;
        }
        const parsed = parseLine(raw, i, []);
        if (!parsed || parsed.structuralError) {
            continue;
        }
        // Cualquier cosa después del valor (comentario # // o /* */) se preserva
        // tal cual estaba en la línea original, no en la versión "limpiada".
        const trailingRaw = originalLine.text.slice(parsed.valueRange.end).trim();
        const trailingText = trailingRaw.length > 0 ? `  ${trailingRaw}` : '';
        const formatted = `${parsed.varName}: ${parsed.declaredType} = ${parsed.value}${trailingText}`;
        if (originalLine.text !== formatted) {
            edits.push(vscode.TextEdit.replace(originalLine.range, formatted));
        }
    }
    edits.push(...normalizeJsDocBlocks(document));
    return edits;
}
/**
 * Normaliza la forma visual de los bloques /** ... *\/ multilínea: mismo
 * indentado que la línea de apertura, prefijo " * " consistente en cada línea
 * de contenido, y las líneas vacías dentro del bloque se normalizan a " *"
 * solo -- que es exactamente lo que extractJsDocAbove interpreta como
 * separador de párrafo, así el formateo y el hover quedan coherentes entre sí.
 * Los bloques de una sola línea (/** texto *\/) no se tocan.
 *
 * @param document Documento a formatear
 * @returns Lista de ediciones para las líneas del bloque de documentación
 */
function normalizeJsDocBlocks(document) {
    const edits = [];
    let start = -1;
    let indent = '';
    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text;
        const trimmed = lineText.trim();
        if (start === -1) {
            // Solo bloques multilínea: /** que NO cierra en la misma línea.
            if (trimmed.startsWith('/**') && !trimmed.slice(3).includes('*/')) {
                start = i;
                indent = lineText.slice(0, lineText.length - lineText.trimStart().length);
            }
            continue;
        }
        if (trimmed === '*/' || trimmed.endsWith('*/')) {
            const formatted = `${indent} */`;
            if (lineText !== formatted) {
                edits.push(vscode.TextEdit.replace(document.lineAt(i).range, formatted));
            }
            start = -1;
            continue;
        }
        const content = trimmed.replace(/^\*/, '').trim();
        const formatted = content.length > 0 ? `${indent} * ${content}` : `${indent} *`;
        if (lineText !== formatted) {
            edits.push(vscode.TextEdit.replace(document.lineAt(i).range, formatted));
        }
    }
    return edits;
}
function activate(context) {
    // 1. AUTOCOMPLETADO
    const providerParam = {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            if (!VARIABLE_COLON_PATTERN.test(linePrefix))
                return undefined;
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
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGE_ID, providerParam, ":"));
    // 2. HOVER (documentación estilo JSDoc/PHPDocumentor)
    context.subscriptions.push(vscode.languages.registerHoverProvider(LANGUAGE_ID, {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position, VAR_WORD_PATTERN);
            if (!range)
                return undefined;
            const word = document.getText(range);
            if (!VAR_NAME_PATTERN.test(word))
                return undefined;
            for (let i = 0; i < document.lineCount; i++) {
                const match = document.lineAt(i).text.match(DECLARATION_LINE_PATTERN);
                if (!match || match[1] !== word)
                    continue;
                const declaredType = match[2];
                const markdown = new vscode.MarkdownString();
                markdown.appendCodeblock(`${word}: ${declaredType}`, 'type');
                const doc = extractJsDocAbove(document, i);
                if (doc) {
                    markdown.appendMarkdown(doc);
                }
                else if (declaredType in description) {
                    markdown.appendMarkdown(description[declaredType]);
                }
                return new vscode.Hover(markdown, range);
            }
            return undefined;
        }
    }));
    // 3. FORMATEO ("Format Document", format on save)
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(LANGUAGE_ID, {
        provideDocumentFormattingEdits(document) {
            return formatDocument(document);
        }
    }));
    // 4. LINTER
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(LANGUAGE_ID);
    context.subscriptions.push(diagnosticCollection);
    function updateDiagnostics(document) {
        if (document.languageId !== LANGUAGE_ID)
            return;
        const diagnostics = [];
        const symbols = new Map();
        const parsedLines = [];
        // El linter no comparte estado con la gramática TextMate: reemplazamos
        // los comentarios de bloque por espacios (misma posición, misma longitud)
        // antes de parsear, así parseLine nunca se entera de que existieron.
        const cleanedLines = stripBlockComments(document.getText()).split(/\r\n|\r|\n/);
        // ---------- PRIMERA PASADA: PARSEO ESTRUCTURAL + TABLA DE SÍMBOLOS ----------
        for (let i = 0; i < document.lineCount; i++) {
            const raw = cleanedLines[i] !== undefined ? cleanedLines[i] : document.lineAt(i).text;
            const parsed = parseLine(raw, i, diagnostics);
            if (!parsed)
                continue; // línea vacía o comentario puro
            parsedLines.push(parsed);
            if (parsed.structuralError)
                continue;
            // Redeclaración
            if (symbols.has(parsed.varName)) {
                const prev = symbols.get(parsed.varName);
                addError(diagnostics, i, parsed.varRange.start, parsed.varRange.end, `La variable '${parsed.varName}' ya fue declarada en la línea ${prev.line + 1}.`);
            }
            else if (types.includes(parsed.declaredType)) {
                // Solo registramos si el tipo es válido
                symbols.set(parsed.varName, {
                    name: parsed.varName,
                    type: parsed.declaredType,
                    line: i
                });
            }
        }
        // ---------- SEGUNDA PASADA: VALIDACIÓN SEMÁNTICA ----------
        for (const p of parsedLines) {
            if (p.structuralError)
                continue;
            validateSemantics(p, symbols, diagnostics);
        }
        diagnosticCollection.set(document.uri, diagnostics);
    }
    // 5. AUTO-ESPACIADO EN BLOQUES JSDoc
    registerJsdocAutoSpace(context);
    // Eventos
    vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document), null, context.subscriptions);
    vscode.window.onDidChangeActiveTextEditor(editor => { if (editor)
        updateDiagnostics(editor.document); }, null, context.subscriptions);
    vscode.workspace.onDidOpenTextDocument(doc => updateDiagnostics(doc), null, context.subscriptions);
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }
}
// ==========================================
// PARSEO ESTRUCTURAL (AUTÓMATA)
// ==========================================
var FSMState;
(function (FSMState) {
    FSMState[FSMState["START"] = 0] = "START";
    FSMState[FSMState["READ_VAR"] = 1] = "READ_VAR";
    FSMState[FSMState["EXPECT_COLON"] = 2] = "EXPECT_COLON";
    FSMState[FSMState["PRE_TYPE"] = 3] = "PRE_TYPE";
    FSMState[FSMState["READ_TYPE"] = 4] = "READ_TYPE";
    FSMState[FSMState["EXPECT_EQUALS"] = 5] = "EXPECT_EQUALS";
    FSMState[FSMState["PRE_VALUE"] = 6] = "PRE_VALUE";
    FSMState[FSMState["READ_VALUE"] = 7] = "READ_VALUE";
    FSMState[FSMState["DONE"] = 8] = "DONE";
})(FSMState || (FSMState = {}));
/**
 * Analiza una línea. Devuelve null si es vacía o comentario puro.
 * Marca structuralError=true si la forma general `VAR: tipo = valor` está rota.
 */
function parseLine(raw, line, diagnostics) {
    const trimmed = raw.trim();
    if (trimmed.length === 0)
        return null;
    if (trimmed.startsWith('#') || trimmed.startsWith('//'))
        return null;
    const result = {
        line, raw,
        varName: "", varRange: { start: 0, end: 0 },
        declaredType: "", typeRange: { start: 0, end: 0 },
        value: "", valueRange: { start: 0, end: 0 },
        structuralError: false
    };
    let state = FSMState.START;
    let i = 0;
    const isComment = (idx) => raw[idx] === '#' || (raw[idx] === '/' && raw[idx + 1] === '/');
    while (i < raw.length && state !== FSMState.DONE) {
        const c = raw[i];
        const ws = c === ' ' || c === '\t';
        switch (state) {
            case FSMState.START:
                if (ws)
                    break;
                if (isComment(i)) {
                    state = FSMState.DONE;
                    break;
                }
                if (/[A-Z]/.test(c)) {
                    result.varRange.start = i;
                    result.varName += c;
                    state = FSMState.READ_VAR;
                }
                else {
                    addError(diagnostics, line, i, i + 1, `Sintaxis inválida. Una declaración debe iniciar con el nombre de variable en MAYÚSCULAS, pero se encontró '${c}'.`);
                    result.structuralError = true;
                    return result;
                }
                break;
            case FSMState.READ_VAR:
                if (/[A-Z_]/.test(c)) {
                    result.varName += c;
                }
                else if (ws) {
                    result.varRange.end = i;
                    state = FSMState.EXPECT_COLON;
                }
                else if (c === ':') {
                    result.varRange.end = i;
                    state = FSMState.PRE_TYPE;
                }
                else {
                    addError(diagnostics, line, result.varRange.start, i + 1, `Carácter '${c}' no permitido en el nombre de variable. Solo se admiten MAYÚSCULAS y guiones bajos.`);
                    result.structuralError = true;
                    return result;
                }
                break;
            case FSMState.EXPECT_COLON:
                if (ws)
                    break;
                if (c === ':') {
                    state = FSMState.PRE_TYPE;
                }
                else {
                    addError(diagnostics, line, i, i + 1, `Se esperaba ':' después de la variable '${result.varName}', pero se encontró '${c}'.`);
                    result.structuralError = true;
                    return result;
                }
                break;
            case FSMState.PRE_TYPE:
                if (ws)
                    break;
                if (/[a-z]/.test(c)) {
                    result.typeRange.start = i;
                    result.declaredType += c;
                    state = FSMState.READ_TYPE;
                }
                else {
                    addError(diagnostics, line, i, i + 1, `Se esperaba un tipo primitivo después de ':', pero se encontró '${c}'.`);
                    result.structuralError = true;
                    return result;
                }
                break;
            case FSMState.READ_TYPE:
                if (/[a-z]/.test(c)) {
                    result.declaredType += c;
                }
                else if (ws) {
                    result.typeRange.end = i;
                    state = FSMState.EXPECT_EQUALS;
                }
                else if (c === '=') {
                    result.typeRange.end = i;
                    state = FSMState.PRE_VALUE;
                }
                else {
                    addError(diagnostics, line, result.typeRange.start, i + 1, `Sintaxis inválida en la declaración del tipo. Se encontró '${c}'.`);
                    result.structuralError = true;
                    return result;
                }
                break;
            case FSMState.EXPECT_EQUALS:
                if (ws)
                    break;
                if (c === '=') {
                    state = FSMState.PRE_VALUE;
                }
                else {
                    addError(diagnostics, line, i, i + 1, `Se esperaba '=' después del tipo '${result.declaredType}', pero se encontró '${c}'.`);
                    result.structuralError = true;
                    return result;
                }
                break;
            case FSMState.PRE_VALUE:
                if (ws)
                    break;
                if (isComment(i)) {
                    state = FSMState.DONE;
                    break;
                }
                result.valueRange.start = i;
                result.value += c;
                state = FSMState.READ_VALUE;
                break;
            case FSMState.READ_VALUE:
                // Comentario solo si va precedido de espacio (para no romper '#' dentro de strings)
                if ((c === '#' && raw[i - 1] === ' ') ||
                    (c === '/' && raw[i + 1] === '/' && raw[i - 1] === ' ')) {
                    state = FSMState.DONE;
                    break;
                }
                result.value += c;
                break;
        }
        i++;
    }
    // Rellenar rangos que quedaron abiertos al llegar a fin de línea
    if (result.varRange.end === 0 && result.varName)
        result.varRange.end = result.varRange.start + result.varName.length;
    if (result.typeRange.end === 0 && result.declaredType)
        result.typeRange.end = result.typeRange.start + result.declaredType.length;
    result.value = result.value.trimEnd();
    result.valueRange.end = result.valueRange.start + result.value.length;
    // ---------- Validación de completitud estructural ----------
    if (state !== FSMState.DONE) {
        if (state === FSMState.READ_VAR || state === FSMState.EXPECT_COLON) {
            addError(diagnostics, line, result.varRange.start, raw.length + 1, `Declaración incompleta: falta ':' y el tipo para la variable '${result.varName}'.`);
            result.structuralError = true;
        }
        else if (state === FSMState.PRE_TYPE) {
            addError(diagnostics, line, 0, raw.length + 1, `Declaración incompleta: falta el tipo después de ':'.`);
            result.structuralError = true;
        }
        else if (state === FSMState.READ_TYPE || state === FSMState.EXPECT_EQUALS) {
            addError(diagnostics, line, 0, raw.length + 1, `Asignación incompleta: falta '=' y el valor para '${result.varName}'.`);
            result.structuralError = true;
        }
        else if (state === FSMState.PRE_VALUE ||
            (state === FSMState.READ_VALUE && result.value.length === 0)) {
            addError(diagnostics, line, 0, raw.length + 1, `Asignación incompleta: se esperaba un valor al final de la línea.`);
            result.structuralError = true;
        }
    }
    // Tipo desconocido (estructuralmente correcto pero tipo inválido)
    if (!result.structuralError && !types.includes(result.declaredType)) {
        addError(diagnostics, line, result.typeRange.start, result.typeRange.end, `Tipo desconocido: '${result.declaredType}'. Tipos válidos: ${types.join(', ')}.`);
        result.structuralError = true; // no vale la pena validar el valor
    }
    return result;
}
// ==========================================
// VALIDACIÓN SEMÁNTICA (con tabla de símbolos)
// ==========================================
function validateSemantics(p, symbols, diagnostics) {
    const targetType = p.declaredType;
    const value = p.value;
    const { start, end } = p.valueRange;
    const isStringLiteral = /^(["'`]).*\1$/.test(value) && value.length >= 2;
    const isReference = VAR_NAME_PATTERN.test(value);
    const isArithmeticExpression = !isStringLiteral &&
        !isReference &&
        ARITHMETIC_EXPRESSION_PATTERN.test(value);
    const isComparisonExpression = !isStringLiteral &&
        !isReference &&
        COMPARISON_EXPRESSION_PATTERN.test(value);
    // ---- 1. Referencia a otra variable ----
    if (isReference) {
        const ref = symbols.get(value);
        if (!ref) {
            addError(diagnostics, p.line, start, end, `Referencia inválida: la variable '${value}' no ha sido declarada.`);
            return;
        }
        if (!ASSIGNABLE[targetType].has(ref.type)) {
            addError(diagnostics, p.line, start, end, `Error de tipos: no se puede asignar '${value}' (tipo '${ref.type}') a una variable de tipo '${targetType}'.`);
        }
        return;
    }
    if (isComparisonExpression) {
        if (targetType !== 'boolean') {
            addError(diagnostics, p.line, start, end, `Error de tipos: las expresiones de comparación producen un valor 'boolean', no '${targetType}'.`);
            return;
        }
        validateComparison(value, symbols, p, diagnostics);
        return;
    }
    // ---- 2. Expresión aritmética ----
    if (isArithmeticExpression) {
        if (!NUMERIC_TYPES.has(targetType)) {
            addError(diagnostics, p.line, start, end, `Error de tipos: las expresiones aritméticas solo son válidas para tipos numéricos, no para '${targetType}'.`);
            return;
        }
        validateExpression(value, targetType, symbols, p, diagnostics);
        return;
    }
    // ---- 3. Literal ----
    validateLiteral(value, targetType, isStringLiteral, p, diagnostics);
}
/** Valida cada operando de una expresión aritmética. */
function validateExpression(expr, targetType, symbols, p, diagnostics) {
    const operands = expr
        .split(/[+\-*/]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    for (const op of operands) {
        if (VAR_NAME_PATTERN.test(op)) {
            const ref = symbols.get(op);
            if (!ref) {
                addError(diagnostics, p.line, p.valueRange.start, p.valueRange.end, `Referencia inválida en la expresión: la variable '${op}' no ha sido declarada.`);
                return;
            }
            if (!NUMERIC_TYPES.has(ref.type)) {
                addError(diagnostics, p.line, p.valueRange.start, p.valueRange.end, `Error de tipos: '${op}' es de tipo '${ref.type}' y no puede usarse en una expresión aritmética.`);
                return;
            }
        }
        else if (!/^-?\d+(\.\d+)?$/.test(op)) {
            addError(diagnostics, p.line, p.valueRange.start, p.valueRange.end, `Operando inválido en la expresión aritmética: '${op}'.`);
            return;
        }
    }
}
function validateComparison(expr, symbols, p, diagnostics) {
    const operands = expr
        .split(/[<>]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    for (const op of operands) {
        if (VAR_NAME_PATTERN.test(op)) {
            const ref = symbols.get(op);
            if (!ref) {
                addError(diagnostics, p.line, p.valueRange.start, p.valueRange.end, `Referencia inválida en la comparación: la variable '${op}' no ha sido declarada.`);
                return;
            }
            if (!NUMERIC_TYPES.has(ref.type)) {
                addError(diagnostics, p.line, p.valueRange.start, p.valueRange.end, `Error de tipos: '${op}' es de tipo '${ref.type}' y no puede utilizarse en una comparación numérica.`);
                return;
            }
        }
        else if (!/^-?\d+(\.\d+)?$/.test(op)) {
            addError(diagnostics, p.line, p.valueRange.start, p.valueRange.end, `Operando inválido en la comparación: '${op}'.`);
            return;
        }
    }
}
/** Valida literales directos contra el tipo destino. */
function validateLiteral(value, targetType, isStringLiteral, p, diagnostics) {
    const { start, end } = p.valueRange;
    let valid = true;
    let msg = "";
    switch (targetType) {
        case 'string':
            valid = isStringLiteral;
            msg = `Un valor de tipo 'string' debe estar entre comillas (", ' o \`). Se encontró '${value}'.`;
            break;
        case 'integer':
            valid = !isStringLiteral && /^-?\d+$/.test(value);
            msg = `Se esperaba un número entero para el tipo 'integer', pero se encontró '${value}'.`;
            break;
        case 'float':
            valid = !isStringLiteral && /^-?\d+\.\d+$/.test(value);
            msg = `Se esperaba un número decimal para el tipo 'float', pero se encontró '${value}'.`;
            break;
        case 'numeric':
            valid = !isStringLiteral && /^-?\d+(\.\d+)?$/.test(value);
            msg = `Se esperaba un número para el tipo 'numeric', pero se encontró '${value}'.`;
            break;
        case 'boolean':
            valid = !isStringLiteral && /^(true|false)$/.test(value);
            msg = `Se esperaba 'true' o 'false' para el tipo 'boolean', pero se encontró '${value}'.`;
            break;
        case 'uuid':
            // Sin comillas: la gramática tokeniza uuid como valor desnudo,
            // igual que numeric/boolean. Entre comillas se leería como 'string'.
            valid = !isStringLiteral &&
                /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
            msg = `Formato inválido: '${value}' no es un UUID válido sin comillas (ej. 3fa85f64-5717-4562-b3fc-2c963f66afa6).`;
            break;
        case 'email':
            // Igual que uuid: sin comillas, según la gramática.
            valid = !isStringLiteral &&
                /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}@[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/.test(value);
            msg = `Formato inválido: '${value}' no es un correo electrónico válido sin comillas.`;
            break;
    }
    if (!valid) {
        addError(diagnostics, p.line, start, end, msg);
    }
}
// ==========================================
// AUTO-ESPACIADO PARA BLOQUES /** */
// ==========================================
/**
 * Cuando el usuario completa "/**" y el propio autoClosingPair del
 * language-configuration.json ya insertó " *\/" a la derecha del cursor,
 * este listener inserta el espacio faltante a la izquierda, dejando el
 * cursor perfectamente centrado: /** | *\/
 *
 * No usamos contentChanges.length === 1 como filtro estricto porque, según
 * la versión de VS Code, la inserción del '*' tecleado y la inserción del
 * cierre " *\/" pueden llegar como dos entradas en el mismo evento. Por eso
 * buscamos específicamente la entrada que insertó el '*'.
 */
function registerJsdocAutoSpace(context) {
    const disposable = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId !== LANGUAGE_ID)
            return;
        if (event.contentChanges.length === 0)
            return;
        const change = event.contentChanges.find(c => c.text === '*' && c.rangeLength === 0);
        if (!change)
            return;
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== event.document)
            return;
        const position = change.range.start.translate(0, 1);
        const lineText = event.document.lineAt(position.line).text;
        const beforeCursor = lineText.slice(0, position.character);
        const afterCursor = lineText.slice(position.character);
        // ¿Se acaba de completar "/**" y ya existe " */" a la derecha
        // (insertado por el autoClosingPair)?
        if (!beforeCursor.endsWith('/**'))
            return;
        if (!afterCursor.startsWith(' */'))
            return;
        if (beforeCursor.endsWith('/** '))
            return; // evita duplicar el espacio
        editor.edit(editBuilder => editBuilder.insert(position, ' '), { undoStopBefore: false, undoStopAfter: false } // un solo "Ctrl+Z" deshace todo
        ).then(success => {
            if (!success)
                return;
            const newPosition = position.translate(0, 1);
            editor.selection = new vscode.Selection(newPosition, newPosition);
        });
    });
    context.subscriptions.push(disposable);
}
// ==========================================
// HELPER
// ==========================================
function addError(diagnostics, line, startCol, endCol, message) {
    const s = Math.max(0, startCol);
    const e = Math.max(s + 1, endCol);
    const range = new vscode.Range(line, s, line, e);
    const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
    diagnostic.code = "DL_SYNTAX_ERROR";
    diagnostics.push(diagnostic);
}
//# sourceMappingURL=extension.js.map