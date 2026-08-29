# Registro de Cambios

Todos los cambios importantes de la extensión `env-type` se documentarán en este archivo.

Consulta [Keep a Changelog](http://keepachangelog.com/) para recomendaciones sobre cómo estructurar este documento.

---

## [Sin publicar]

---

## [0.0.10] – 2026-08-29

### Agregado

* **Linter Semántico y Diagnósticos en Tiempo Real:** Motor de análisis sintáctico y semántico mediante autómata de estados finitos (FSM), validando tipos compatibles, variables no declaradas, redeclaraciones duplicadas y literales malformados (`DLUNIRE_SYNTAX_ERROR`).
* **Expresiones Aritméticas y Comparaciones Lógicas:** Validación semántica de expresiones matemáticas (`+`, `-`, `*`, `/`) en tipos numéricos (`integer`, `float`, `numeric`) y expresiones de comparación (`<`, `>`) para variables de tipo `boolean`.
* **Hover Provider con Bloques JSDoc/PHPDoc:** Extracción inteligente y renderizado en Markdown de bloques de documentación `/** ... */` al pasar el cursor sobre cualquier variable declarada.
* **Formateador Automático de Documentos:** Implementación de `DocumentFormattingEditProvider` para normalizar declaraciones (`VARIABLE: tipo = valor`), preservar comentarios en línea y formatear bloques de documentación multilínea.
* **Auto-Espaciado JSDoc:** Asistente en tiempo de edición que inserta el espacio faltante y centra el cursor al completar `/** | */`.
* **Soporte Extendido de Archivos:** Asociación automática para extensiones `.type`, `.type.example`, `.env.type` y `.env.type.example`.
* **Operador Aritmético `/` en Gramática:** Incorporación de división en la gramática TextMate para expresiones complejas.
* **Scopes Personalizados `dlunire.*`:** Integración de selectores apilados junto a scopes estándar de TextMate para theming avanzado y retrocompatibilidad total.
* **Metadatos de Repositorio:** Configuración de `repository.type: "git"` en `package.json`.

### Corregido

* Se corrigió el desajuste entre `grammars.scopeName` en `package.json` (`source.env.type`) y el `scopeName` real declarado en la gramática (`source.type`), que impedía que el resaltado de sintaxis se activara.
* Se corrigió un typo en el patrón de `uuid` (`[0-f0-9]` → `[a-f0-9]`) que causaba fallos en el reconocimiento de UUIDs válidos.
* Se corrigió un valor inválido de `lineComment` en `language-configuration.json` (era un objeto; VS Code requiere un string plano), restaurando el atajo `Ctrl+/` para comentar líneas.
* Se corrigió la condición de disparo de IntelliSense en `CompletionItemProvider`: ahora se activa exclusivamente tras el delimitador `:` en la declaración de variables.
* Se corrigió la referencia `path` de la gramática en `package.json` para coincidir con `syntaxes/dluniretype.tmLanguage.json`.

### Cambiado

* Se refactorizó el `repository` de la gramática a tokens léxicos independientes (`variable`, `colon`, `types`, `operator-assign`, `operator-arithmetic` y literales), permitiendo el análisis de expresiones que referencian variables.
* Se ajustó la lógica de inserción de autocompletado para evitar espacios dobles tras `:`.
* Se optimizó el flujo de validación y limpieza de comentarios de bloque en `src/extension.ts`.

---

## [0.0.8] – 2025-12-04

### Agregado

* Se implementó **autocompletado IntelliSense** para los tipos de variable definidos en `env.type`.
* Se integró la interfaz `Types` y el diccionario `description` para ofrecer documentación en tooltips de los tipos soportados.
* Se estableció un `CompletionItemProvider` inicial para futura expansión del lenguaje (parser, validación, formateo).

### Cambiado

* Se avanzó hacia una arquitectura orientada a herramientas de lenguaje, preparando el terreno para el refactor del parser y la extensión del DSL.
* Se reorganizó la estructura interna para permitir futuras evoluciones al estilo `rust-analyzer`.

### Corregido

* Ninguno.

---

## [0.0.7] – 2025-02-XX

### Cambiado

* Se eliminó el bloque de contribución `productIconThemes` para asegurar que la extensión no sea tratada como un tema o proveedor de íconos.
* La extensión ahora opera exclusivamente como resaltador de sintaxis para archivos `.env.type`.
* Se actualizó el manifiesto de contribución para declarar estrictamente solo definiciones de lenguaje y gramática.

### Corregido

* Se corrigió un comportamiento no intencionado donde la extensión era clasificada como tema debido a una configuración previa.

### Agregado

* Ninguno.