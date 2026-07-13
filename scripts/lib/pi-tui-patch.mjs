const OVERFLOW_THROW_BLOCK = `            const line = newLines[i];
            const isImage = isImageLine(line);
            if (!isImage && visibleWidth(line) > width) {
                // Log all lines to crash file for debugging
                const crashLogPath = path.join(os.homedir(), ".pi", "agent", "pi-crash.log");
                const crashData = [
                    \`Crash at \${new Date().toISOString()}\`,
                    \`Terminal width: \${width}\`,
                    \`Line \${i} visible width: \${visibleWidth(line)}\`,
                    "",
                    "=== All rendered lines ===",
                    ...newLines.map((l, idx) => \`[\${idx}] (w=\${visibleWidth(l)}) \${l}\`),
                    "",
                ].join("\\n");
                fs.mkdirSync(path.dirname(crashLogPath), { recursive: true });
                fs.writeFileSync(crashLogPath, crashData);
                // Clean up terminal state before throwing
                this.stop();
                const errorMsg = [
                    \`Rendered line \${i} exceeds terminal width (\${visibleWidth(line)} > \${width}).\`,
                    "",
                    "This is likely caused by a custom TUI component not truncating its output.",
                    "Use visibleWidth() to measure and truncateToWidth() to truncate lines.",
                    "",
                    \`Debug log written to: \${crashLogPath}\`,
                ].join("\\n");
                throw new Error(errorMsg);
            }
            buffer += line;`;

const OVERFLOW_TRUNCATE_BLOCK = `            let line = newLines[i];
            const isImage = isImageLine(line);
            if (!isImage && visibleWidth(line) > width) {
                line = sliceByColumn(line, 0, width, true);
            }
            buffer += line;`;

const OVERFLOW_THROW_BLOCK_AFTER_CLEAR = `            const line = newLines[i];
            const isImage = isImageLine(line);
            const imageReservedRows = isImage ? this.getKittyImageReservedRows(newLines, i, renderEnd) : 1;
            if (imageReservedRows > 1) {
                const imageStartScreenRow = i - viewportTop;
                if (imageStartScreenRow < 0 || imageStartScreenRow + imageReservedRows > height) {
                    logRedraw(\`kitty image pre-clear would scroll (\${imageStartScreenRow} + \${imageReservedRows} > \${height})\`);
                    fullRender(true);
                    return;
                }
                buffer += "\\x1b[2K";
                for (let row = 1; row < imageReservedRows; row++) {
                    buffer += "\\r\\n\\x1b[2K";
                }
                buffer += \`\\x1b[\${imageReservedRows - 1}A\`;
                buffer += line;
                buffer += \`\\x1b[\${imageReservedRows - 1}B\`;
                i += imageReservedRows - 1;
                continue;
            }
            buffer += "\\x1b[2K"; // Clear current line
            if (!isImage && visibleWidth(line) > width) {
                // Log all lines to crash file for debugging
                const crashLogPath = path.join(os.homedir(), ".pi", "agent", "pi-crash.log");
                const crashData = [
                    \`Crash at \${new Date().toISOString()}\`,
                    \`Terminal width: \${width}\`,
                    \`Line \${i} visible width: \${visibleWidth(line)}\`,
                    "",
                    "=== All rendered lines ===",
                    ...newLines.map((l, idx) => \`[\${idx}] (w=\${visibleWidth(l)}) \${l}\`),
                    "",
                ].join("\\n");
                fs.mkdirSync(path.dirname(crashLogPath), { recursive: true });
                fs.writeFileSync(crashLogPath, crashData);
                // Clean up terminal state before throwing
                this.stop();
                const errorMsg = [
                    \`Rendered line \${i} exceeds terminal width (\${visibleWidth(line)} > \${width}).\`,
                    "",
                    "This is likely caused by a custom TUI component not truncating its output.",
                    "Use visibleWidth() to measure and truncateToWidth() to truncate lines.",
                    "",
                    \`Debug log written to: \${crashLogPath}\`,
                ].join("\\n");
                throw new Error(errorMsg);
            }
            buffer += line;`;

const OVERFLOW_TRUNCATE_BLOCK_AFTER_CLEAR = `            let line = newLines[i];
            const isImage = isImageLine(line);
            const imageReservedRows = isImage ? this.getKittyImageReservedRows(newLines, i, renderEnd) : 1;
            if (imageReservedRows > 1) {
                const imageStartScreenRow = i - viewportTop;
                if (imageStartScreenRow < 0 || imageStartScreenRow + imageReservedRows > height) {
                    logRedraw(\`kitty image pre-clear would scroll (\${imageStartScreenRow} + \${imageReservedRows} > \${height})\`);
                    fullRender(true);
                    return;
                }
                buffer += "\\x1b[2K";
                for (let row = 1; row < imageReservedRows; row++) {
                    buffer += "\\r\\n\\x1b[2K";
                }
                buffer += \`\\x1b[\${imageReservedRows - 1}A\`;
                buffer += line;
                buffer += \`\\x1b[\${imageReservedRows - 1}B\`;
                i += imageReservedRows - 1;
                continue;
            }
            buffer += "\\x1b[2K"; // Clear current line
            if (!isImage && visibleWidth(line) > width) {
                line = sliceByColumn(line, 0, width, true);
            }
            buffer += line;`;

// Two known upstream layouts: pi-tui <=0.75 and the 0.76+ Unicode
// word-navigation rework. Both need applyBackgroundToLine added for the
// background-fill render below.
const EDITOR_IMPORT_PAIRS = [
	[
		'import { getSegmenter, isPunctuationChar, isWhitespaceChar, truncateToWidth, visibleWidth } from "../utils.js";',
		'import { applyBackgroundToLine, getSegmenter, isPunctuationChar, isWhitespaceChar, truncateToWidth, visibleWidth } from "../utils.js";',
	],
	[
		'import { getGraphemeSegmenter, getWordSegmenter, isWhitespaceChar, truncateToWidth, visibleWidth } from "../utils.js";',
		'import { applyBackgroundToLine, getGraphemeSegmenter, getWordSegmenter, isWhitespaceChar, truncateToWidth, visibleWidth } from "../utils.js";',
	],
];

const EDITOR_RENDER_BLOCK = [
	"    render(width) {",
	"        const maxPadding = Math.max(0, Math.floor((width - 1) / 2));",
	"        const paddingX = Math.min(this.paddingX, maxPadding);",
	"        const contentWidth = Math.max(1, width - paddingX * 2);",
	"        // Layout width: with padding the cursor can overflow into it,",
	"        // without padding we reserve 1 column for the cursor.",
	"        const layoutWidth = Math.max(1, contentWidth - (paddingX ? 0 : 1));",
	"        // Store for cursor navigation (must match wrapping width)",
	"        this.lastWidth = layoutWidth;",
	'        const horizontal = this.borderColor("─");',
	"        const bgColor = this.theme.bgColor;",
	"        // Layout the text",
	"        const layoutLines = this.layoutText(layoutWidth);",
	"        // Calculate max visible lines: 30% of terminal height, minimum 5 lines",
	"        const terminalRows = this.tui.terminal.rows;",
	"        const maxVisibleLines = Math.max(5, Math.floor(terminalRows * 0.3));",
	"        // Find the cursor line index in layoutLines",
	"        let cursorLineIndex = layoutLines.findIndex((line) => line.hasCursor);",
	"        if (cursorLineIndex === -1)",
	"            cursorLineIndex = 0;",
	"        // Adjust scroll offset to keep cursor visible",
	"        if (cursorLineIndex < this.scrollOffset) {",
	"            this.scrollOffset = cursorLineIndex;",
	"        }",
	"        else if (cursorLineIndex >= this.scrollOffset + maxVisibleLines) {",
	"            this.scrollOffset = cursorLineIndex - maxVisibleLines + 1;",
	"        }",
	"        // Clamp scroll offset to valid range",
	"        const maxScrollOffset = Math.max(0, layoutLines.length - maxVisibleLines);",
	"        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScrollOffset));",
	"        // Get visible lines slice",
	"        const visibleLines = layoutLines.slice(this.scrollOffset, this.scrollOffset + maxVisibleLines);",
	"        const result = [];",
	'        const leftPadding = " ".repeat(paddingX);',
	"        const rightPadding = leftPadding;",
	"        const renderBorderLine = (indicator) => {",
	"            const remaining = width - visibleWidth(indicator);",
	"            if (remaining >= 0) {",
	'                return this.borderColor(indicator + "─".repeat(remaining));',
	"            }",
	"            return this.borderColor(truncateToWidth(indicator, width));",
	"        };",
	"        // Render top padding row. When background fill is active, mimic the user-message block",
	"        // instead of the stock editor chrome.",
	"        if (bgColor) {",
	"            if (this.scrollOffset > 0) {",
	"                const indicator = `  ↑ ${this.scrollOffset} more`;",
	"                result.push(applyBackgroundToLine(indicator, width, bgColor));",
	"            }",
	"            else {",
	'                result.push(applyBackgroundToLine("", width, bgColor));',
	"            }",
	"        }",
	"        else if (this.scrollOffset > 0) {",
	"            const indicator = `─── ↑ ${this.scrollOffset} more `;",
	"            result.push(renderBorderLine(indicator));",
	"        }",
	"        else {",
	"            result.push(horizontal.repeat(width));",
	"        }",
	"        // Render each visible layout line",
	"        // Emit hardware cursor marker when focused so the TUI can position the",
	"        // hardware cursor for IME candidate windows even while autocomplete is open.",
	"        const emitCursorMarker = this.focused;",
	"        const showPlaceholder = this.state.lines.length === 1 &&",
	'            this.state.lines[0] === "" &&',
	'            typeof this.theme.placeholderText === "string" &&',
	"            this.theme.placeholderText.length > 0;",
	"        const styleInput = typeof this.theme.input === \"function\" ? this.theme.input : (text) => text;",
	"        for (let visibleIndex = 0; visibleIndex < visibleLines.length; visibleIndex++) {",
	"            const layoutLine = visibleLines[visibleIndex];",
	"            const isFirstLayoutLine = this.scrollOffset + visibleIndex === 0;",
	"            let displayText = layoutLine.text;",
	"            let lineVisibleWidth = visibleWidth(layoutLine.text);",
	"            const isPlaceholderLine = showPlaceholder && isFirstLayoutLine;",
	"            if (isPlaceholderLine) {",
	"                const marker = emitCursorMarker ? CURSOR_MARKER : \"\";",
	"                const rawPlaceholder = this.theme.placeholderText;",
	'                const styledPlaceholder = typeof this.theme.placeholder === "function"',
	"                    ? this.theme.placeholder(rawPlaceholder)",
	"                    : rawPlaceholder;",
	"                displayText = marker + styledPlaceholder;",
	"                lineVisibleWidth = visibleWidth(rawPlaceholder);",
	"            }",
	"            else if (layoutLine.hasCursor && layoutLine.cursorPos !== undefined) {",
	'                const marker = emitCursorMarker ? CURSOR_MARKER : "";',
	"                const before = displayText.slice(0, layoutLine.cursorPos);",
	"                const after = displayText.slice(layoutLine.cursorPos);",
	"                displayText = styleInput(before) + marker + styleInput(after);",
	"            }",
	"            else {",
	"                displayText = styleInput(displayText);",
	"            }",
	"            // Calculate padding based on actual visible width",
	'            const padding = " ".repeat(Math.max(0, contentWidth - lineVisibleWidth));',
	"            const renderedLine = `${leftPadding}${displayText}${padding}${rightPadding}`;",
	"            result.push(bgColor ? applyBackgroundToLine(renderedLine, width, bgColor) : renderedLine);",
	"        }",
	"        // Render bottom padding row. When background fill is active, mimic the user-message block",
	"        // instead of the stock editor chrome.",
	"        const linesBelow = layoutLines.length - (this.scrollOffset + visibleLines.length);",
	"        if (bgColor) {",
	"            if (linesBelow > 0) {",
	"                const indicator = `  ↓ ${linesBelow} more`;",
	"                result.push(applyBackgroundToLine(indicator, width, bgColor));",
	"            }",
	"            else {",
	'                result.push(applyBackgroundToLine("", width, bgColor));',
	"            }",
	"        }",
	"        else if (linesBelow > 0) {",
	"            const indicator = `─── ↓ ${linesBelow} more `;",
	"            const bottomLine = renderBorderLine(indicator);",
	"            result.push(bottomLine);",
	"        }",
	"        else {",
	"            const bottomLine = horizontal.repeat(width);",
	"            result.push(bottomLine);",
	"        }",
	"        // Add autocomplete list if active",
	"        if (this.autocompleteState && this.autocompleteList) {",
	"            const autocompleteResult = this.autocompleteList.render(contentWidth);",
	"            for (const line of autocompleteResult) {",
	"                const lineWidth = visibleWidth(line);",
	'                const linePadding = " ".repeat(Math.max(0, contentWidth - lineWidth));',
	"                const autocompleteLine = `${leftPadding}${line}${linePadding}${rightPadding}`;",
	"                result.push(bgColor ? applyBackgroundToLine(autocompleteLine, width, bgColor) : autocompleteLine);",
	"            }",
	"        }",
	"        return result;",
	"    }",
].join("\n");

const EDITOR_THEME_BLOCK = [
	"export function getEditorTheme() {",
	"    return {",
	'        borderColor: (text) => " ".repeat(text.length),',
	'        bgColor: (text) => theme.bg("userMessageBg", text),',
	'        input: (text) => theme.fg("text", text),',
	'        placeholderText: "Type your message or /help for commands",',
	'        placeholder: (text) => theme.fg("dim", text),',
	"        selectList: getSelectListTheme(),",
	"    };",
	"}",
].join("\n");

export function patchPiTuiSource(source) {
	if (source.includes("line = sliceByColumn(line, 0, width, true);")) {
		return source;
	}
	if (source.includes(OVERFLOW_THROW_BLOCK)) {
		return source.replace(OVERFLOW_THROW_BLOCK, OVERFLOW_TRUNCATE_BLOCK);
	}
	if (source.includes(OVERFLOW_THROW_BLOCK_AFTER_CLEAR)) {
		return source.replace(OVERFLOW_THROW_BLOCK_AFTER_CLEAR, OVERFLOW_TRUNCATE_BLOCK_AFTER_CLEAR);
	}
	return source;
}

export function patchPiEditorSource(source) {
	let patched = source;
	let importsPatched = patched.includes("applyBackgroundToLine,");
	for (const [original, replacement] of EDITOR_IMPORT_PAIRS) {
		if (patched.includes(original)) {
			patched = patched.replace(original, replacement);
			importsPatched = true;
		}
	}
	if (patched.includes("const styleInput = typeof this.theme.input")) {
		return patched;
	}
	if (!importsPatched) {
		// Unknown upstream layout: leave render() untouched rather than emit a
		// body that references applyBackgroundToLine without importing it.
		return source;
	}
	return patched.replace(
		/    render\(width\) \{[\s\S]*?\n    handleInput\(data\) \{/m,
		`${EDITOR_RENDER_BLOCK}\n    handleInput(data) {`,
	);
}

export function patchPiInteractiveThemeSource(source) {
	if (
		source.includes('bgColor: (text) => theme.bg("userMessageBg", text),') &&
		source.includes('input: (text) => theme.fg("text", text),')
	) {
		return source;
	}
	return source.replace(
		/export function getEditorTheme\(\) \{[\s\S]*?\n\}\nexport function getSettingsListTheme\(\) \{/m,
		`${EDITOR_THEME_BLOCK}\nexport function getSettingsListTheme() {`,
	);
}
