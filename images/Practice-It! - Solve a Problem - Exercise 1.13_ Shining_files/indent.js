/**
 * This JS file contains code for the Indent button that auto-re-indents student code.
 *
 * history:
 * - 2010/12/28: "fixed" bug related to extraneous if/for/while matches
 */

var NBSP_CHAR_CODE = 160; // character code for non-breaking space (grr Safari)
var LINE_SEPARATOR = "\n";
var LINE_SEPARATOR_OUTPUT = "\n";
var DEFAULT_SPACES_PER_TAB = 4;
var DEFAULT_TAB_STRING = buildTabString(DEFAULT_SPACES_PER_TAB);
var TAB_STRING = DEFAULT_TAB_STRING;

function buildTabString(spaces) {
    var tabString = "";
    for (var i = 0; i < spaces; i++) {
        tabString += " ";
    }
    return tabString;
}

// given text running up to cursor, return spaces to put at
// start of next line.
function figureIndent(str) {
    var eol = str.lastIndexOf(LINE_SEPARATOR);
    // eol==-1 works ok
    var line = str.substring(eol + LINE_SEPARATOR.length); // take from eol to end
    var indent = "";
    for (var i = 0; i < line.length && (line.charAt(i) == " " || line.charCodeAt(i) == NBSP_CHAR_CODE); i++) {
        indent += " ";
    }
    return indent;
}

// function stripLeft

function indent(code, indentString) {
    if (!indentString) {
        indentString = "    ";
    }

    var newCode = "";
    var indentLevel = 0;
    var indentDuration = 0;     // used for temporary indents like 1-line ifs
    var newLines = [];
    var inMultiLineComment = false;

    var lines = code.split(/[\r]?\n/gi);
    for (var i = 0; i < lines.length; i++) {
        var line = trim(lines[i]);
        var lineForMatching = line.replace(/\/\/.*/, "");

		// ignore stuff in strings
		lineForMatching = lineForMatching.replace(/\"[^\"]*\"/gi, "");

        // ignore stuff in comments

        var lbrackets = lineForMatching.replace(/[^\{]+/gi, "");
        var rbrackets = lineForMatching.replace(/[^\}]+/gi, "");
        var lbracket1 = lineForMatching.indexOf("{");
        var rbracket1 = lineForMatching.indexOf("}");
        var lbracketN = lineForMatching.lastIndexOf("{");
        var rbracketN = lineForMatching.lastIndexOf("}");

        var increaseIndentBefore = false;
        var decreaseIndentBefore = false;
        var increaseIndentAfter = false;
        var decreaseIndentAfter = false;

        if (lbrackets.length > rbrackets.length ||
            lbracketN >= 0 && lbracketN > rbracketN) {
            // opening brace(s) on this line; indent subsequent lines
            increaseIndentAfter = true;
        }
        if (rbrackets.length > lbrackets.length ||
            rbracket1 >= 0 && rbracket1 < lbracket1) {
            // closing brace(s) on this line; decrease this line and subseqent lines
            decreaseIndentBefore = true;
        }

        // closing bracket; decrease indent
        // indentLevel = Math.max(0, indentLevel - 1);

        // check for a prior temporary indent (unbracketed if/else)
        // and get rid of it if so
        if (indentDuration > 0) {
            // if (lbrackets.length != rbrackets.length ||
            // (!lineForMatching.match(/(if |for |while )[ \t]*([^)]*)/) &&
        // !lineForMatching.match(/else /))) {
            indentDuration--;
            if (indentDuration == 0) {
                // indentLevel = Math.max(0, indent - 1);
                decreaseIndentAfter = true;
            }
            // }
        }

        // check for a new temporary indent (unbracketed if/else)
        // on this line and increase subsequent indent temporarily if so
        // side note: f**k unbracketed if/elses for making me write this code
        if (
        (
        (lbrackets.length < rbrackets.length || rbracketN > lbracketN) ||
            (lbrackets.length == 0 && rbrackets.length == 0)
    )
            &&
            (
        // BUGFIX: was erroneously matching words like 'for' found in strings
        (lineForMatching.match(/(if[ ]?|while[ ]?)[ \t]*\(([^)]*)\)/) && !lineForMatching.match(/;/)) ||
            (lineForMatching.match(/(for[ ]?)[ \t]*\(([^)]*)\)/)) ||
            (lineForMatching.match(/else/) &&
            (
            !lineForMatching.match(/else[ ]+if/) &&
            // !lineForMatching.match(/ /)
        (lbrackets.length == 0 || lbrackets.length > rbrackets.length)
    )
    )
    )
    ) {
            increaseIndentAfter = true;
            indentDuration = 1;
        }

        // pre-print indentation adjustments
        if (increaseIndentBefore) {
            indentLevel++;
        } else if (decreaseIndentBefore) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // store this line, indented (hopefully) properly
        for (var tabs = 0; tabs < indentLevel; tabs++) {
            line = indentString + line;
        }
        newLines.push(line);

        // post-print indentation adjustments
        if (increaseIndentAfter) {
            indentLevel++;
        } else if (decreaseIndentAfter) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
    }

    // put the newly indented lines into the text area on the page
    newCode = newLines.join("\n");
    return newCode;
}

// Inserts a special character (\n or \t) into the given textarea.
// Based on some code used in javabat: http://javabat.com/ by Nick Parlante
// Modified to work with inserting tabs, shift-tabs (non-IE),
// and to maintain indentation on IE (which it didn't do in javabat).
function insertCharacter(textarea, str, shiftKey) {
    if (textarea.selectionStart !== undefined) {
        // Firefox/Opera/Safari (real browsers)
        var before = textarea.value.substring(0, textarea.selectionStart);
        var indent = figureIndent(before);
        var selectionStart = textarea.selectionStart;
        var selectionEnd = textarea.selectionEnd;
        var during = textarea.value.substring(textarea.selectionStart,
                selectionEnd);
        var isMultiLine = selectionStart != selectionEnd; // (during.indexOf(LINE_SEPARATOR) >= 0);
        var after = textarea.value.substring(textarea.selectionEnd,
                textarea.value.length);

        // update the text field
        var scrollTop = textarea.scrollTop; // this inhibits annoying auto-scroll
        var newSelectionStart = 0;
        var newSelectionEnd = 0;

        if (str == LINE_SEPARATOR) {
            // if pressing enter at the end of a line that ends with left-brace, indent
            var shift = 0;
            if (before.endsWith("{")) {
                textarea.value = before + str + indent + TAB_STRING + after;
                shift = TAB_STRING.length;
            } else {
                textarea.value = before + str + indent + after;
            }
            newSelectionStart = newSelectionEnd = selectionEnd + indent.length + LINE_SEPARATOR.length + shift;
        } else if (str == TAB_STRING) {
            // tab
            if (shiftKey) {
                // remove a tab
                if (isMultiLine) {
                    newSelectionStart = selectionStart;
                    newSelectionEnd = selectionEnd;
                    var lines = during.split(LINE_SEPARATOR);
                    for (var i = 0; i < lines.length; i++) {
                        if (lines[i]) {
                            for (var j = 0;
                                    j < TAB_STRING.length &&
                                    lines[i].length > 0 &&
                                    lines[i].charAt(0) == TAB_STRING.charAt(0);
                                    j++) {
                                lines[i] = lines[i].substring(1);
                                newSelectionEnd--;
                            }
                        }
                    }

                    textarea.value = before + lines.join(LINE_SEPARATOR) + after;
                } else {
                    for (var i = 0;
                            i < TAB_STRING.length &&
                            before.length > 0 &&
                            before.charAt(before.length - 1) == TAB_STRING.charAt(0);
                            i++) {
                        before = before.substring(0, before.length - 1);
                    }

                    textarea.value = before + after;
                    newSelectionStart = newSelectionEnd = selectionEnd - Math.min(i, TAB_STRING.length);
                }
            } else {
                // add a tab
                if (isMultiLine) {
                    newSelectionStart = selectionStart;
                    newSelectionEnd = selectionEnd;
                    var lines = during.split(LINE_SEPARATOR);
                    // alert("multi-line: " + lines.join(" | "));
                    for ( var i = 0; i < lines.length; i++) {
                        if (lines[i]) {
                            lines[i] = TAB_STRING + lines[i];
                            newSelectionEnd += TAB_STRING.length;
                        }
                    }
                    textarea.value = before + lines.join(LINE_SEPARATOR) + after;
                } else {
                    textarea.value = before + TAB_STRING + after;
                    newSelectionStart = newSelectionEnd = selectionEnd + TAB_STRING.length;
                }
            }
        } else if (str == "}") {
            var thisLineIndent = figureIndent(before);

            var shift = 0;
            if (before.endsWith(TAB_STRING)) {
                shift = TAB_STRING.length;
                before = before.substring(0, before.length - shift);

            }
            textarea.value = before + str + after;
            newSelectionStart = newSelectionEnd = selectionEnd - shift + 1;   // +1 for the }
        }

        //textarea.focus();
        textarea.selectionStart = newSelectionStart;
        textarea.selectionEnd = newSelectionEnd;
        textarea.scrollTop = scrollTop;

        // we actually did it, so return false
        return false;
    } else if (document.selection && document.selection.createRange) { // IE
        var range = document.selection.createRange();
        var range_obj = textarea.createTextRange();
        // range_obj = document.selection.createRange();
        range_obj.moveToBookmark(range.getBookmark());
        range_obj.moveEnd('character', textarea.value.length);
        var cursor = textarea.value.length - range_obj.text.length;

        var before = textarea.value.substring(0, cursor);
        // alert("cursor: " + cursor + "\nbefore: '" + before + "'");
        var indent = figureIndent(before);
        if (indent == "" && str == LINE_SEPARATOR) {
            return true; // let natural event do it -- line 1 IE bug
        }

        range = document.selection.createRange().duplicate();
        range.text = str + (str == LINE_SEPARATOR ? indent : "");
        return false;
    }

    return true;
}

function padL(text, length) {
    while (text.length < length) {
        text = " " + text;
    }
    return text;
}

function padR(text, length) {
    while (text.length < length) {
        text = text + " ";
    }
    return text;
}

function htmlDecode(text, skipNbsp) {
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, "\"");
    if (!skipNbsp) {
        text = text.replace(/&nbsp;/g, " ");
    }
    text = text.replace(/&amp;/g, "&");
    return text;
}

function htmlEncode(text, skipNbsp) {
    text = text.replace(/&/g, "&amp;");
    text = text.replace(/</g, "&lt;");
    text = text.replace(/>/g, "&gt;");
    text = text.replace(/"/g, "&quot;");
    if (!skipNbsp) {
        text = text.replace(/ /g, "&nbsp;");
    }
    return text;
}

function isSpace(c) {
    return c.charCodeAt(0) <= " ".charCodeAt(0) || c.charCodeAt(0) == NBSP_CHAR_CODE;
}

function ltrim(str) {
    for (var k = 0; k < str.length && isSpace(str.charAt(k)); k++);
    return str.substring(k, str.length);
}

function rtrim(str) {
    for (var j = str.length - 1; j >= 0 && isSpace(str.charAt(j)); j--);
    return str.substring(0, j+1);
}

function trim(str) {
    return ltrim(rtrim(str));
}
