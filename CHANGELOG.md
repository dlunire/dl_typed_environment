# Registro de Cambios

Todos los cambios importantes de la extensión `env-type` se documentarán en este archivo.

Consulta [Keep a Changelog](http://keepachangelog.com/) para recomendaciones sobre cómo estructurar este documento.

---

## [Sin publicar]

---

## [0.0.9] – 2026-08-16

### Corregido

* Se corrigió el desajuste entre `grammars.scopeName` en `package.json` (`source.env.type`) y el `scopeName` real declarado en la gramática (`source.type`), que impedía silenciosamente que el resaltado de sintaxis se activara.
* Se corrigió un typo en el patrón de `uuid` (`[0-f0-9]` → `[a-f0-9]`) que hacía fallar el reconocimiento de UUIDs válidos.
* Se corrigió un valor inválido de `lineComment` en `language-configuration.json` (era un objeto; VS Code requiere un string plano), lo que desactivaba silenciosamente el atajo `Ctrl+/` para comentar líneas.
* Se corrigió la condición de disparo del autocompletado (`IntelliSense`) en `CompletionItemProvider`: antes se activaba con cualquier `:` en la línea (incluso dentro de valores ya escritos), en vez de solo justo después de declarar una variable.
* Se corrigió la referencia `path` de la gramática en `package.json` para que coincida con el nombre real del archivo (`syntaxes/dluniretype.tmLanguage.json`).

### Agregado

* Se agregó `/` como operador aritmético reconocido en la gramática, acorde al uso real en expresiones (ej. `PI_VALUE / 2.0`).
* Se agregó un scope personalizado `dlunire.*` apilado junto a cada scope estándar de TextMate (comentarios, strings, variables, operadores y literales), permitiendo un theming específico de DLUnire sin perder compatibilidad con temas de color de terceros.
* Se agregó `repository.type: "git"` a los metadatos de `package.json`.

### Cambiado

* Se refactorizó el `repository` de la gramática: de patrones duplicados y anclados a fin de línea por cada tipo, a tokens léxicos independientes (`variable`, `colon`, `type-keyword`, `operator-assign`, `operator-arithmetic` y literales), permitiendo que expresiones que referencian otras variables (ej. `RESULT: integer = COUNT + 25`) se tokenicen correctamente.
* Se ajustó la lógica de inserción del autocompletado para evitar un espacio duplicado cuando el usuario ya había escrito uno después de `:`.
* Se eliminó una verificación redundante `if (type in description)` en `extension.ts`, ya que siempre era verdadera por construcción.

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