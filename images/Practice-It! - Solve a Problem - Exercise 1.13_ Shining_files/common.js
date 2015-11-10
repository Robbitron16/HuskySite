/**
 * This JS file contains common code used throughout many pages of Practice-It.
 *
 * history:
 * - 2010/12/28: added function to get stack trace from an exception (taken from web)
 *
 * @author Marty Stepp and Jessica Miller
 */

var COLLAPSE_MULTIPLE_SPACES = true; // treat many spaces as a single space for diffing expressions?
var ANGRY_AD_FAIL = false;

if (typeof(document.observe) === "function") {
	document.observe("dom:loaded", function() {
		$$(".confirmlink").each(function(element) {
			element.observe("click", function(event) {
				var message = element.getAttribute("rel") || "Are you sure?";
				if (!confirm(message)) {
					abortEvent(event);
				}
			});
		});
		
		// don't proceed with showing the page if the user has AdBlock enabled :'(
		// (functionality disabled for now)
		/*
		if (!location.href.match(/adblock.jsp/)
				&& !location.href.match(/about.jsp/)
				&& !location.href.match(/contactus.jsp/)
				&& $("practiceitgooglead") && !$("noad")) {
			var height = $("practiceitgooglead").getStyle("height");
			var iframes = $("practiceitgooglead").select("iframe").length;
			var adblockTester = $("advertisementtester");
			if (height <= 0 || iframes == 0 || !adblockTester) {
				if (typeof(localStorage) == "undefined" || !localStorage["noadblock"]) {
					ANGRY_AD_FAIL = true;
					if ($("adblockoverlay")) {
						$("adblockoverlay").show();
					}
				}
			}
		}
		*/
	});
}

function inDebugMode() {
    var pageQueryParams = Page.getQueryString();
    return pageQueryParams["debug"];
}

function abortEvent(event) {
    event = EventExtend(event);
    return event.abort();
}

function ajaxFailure(ajax, exception) {
    var body = ajax && ajax.responseText ? ajax.responseText : "";
    if (isTomcatError(ajax) || ajax.status == 404) {
        var bodyStart = body.indexOf("<body>");
        if (bodyStart >= 0) {
            var bodyEnd = body.indexOf("</body>");
            if (bodyEnd >= 0 && bodyEnd >= bodyStart) {
                body = body.substring(bodyStart + 6, bodyEnd);
            }
        }
    } else if (exception) {
        body += "Exception " + exception + ":<br/>\n" + exception.message + "<br/>\n<br/>\nStack trace: " + Exceptions.getStackTrace(exception);
    } else {
        body = "HTTP error " + ajax.status + " " + body;
    }
    if ($("testresultsarea")) {
        $("testresultsarea").update("<p style=\"text-align: center\">Ajax error while contacting server:</p>\n\n" + body);
        // solutionAjaxCommon();
    } else if ($("dumparea")) {
        $("dumparea").update("<p style=\"text-align: center\">Ajax error while contacting server:</p>\n\n" + body);
    }
}

function categoriesChange(event) {
    $$("#problemsform select").each(function(element) {
        if (element.id != "categories" && element.style.display != "none") {
            element.name = "";
            // $(element).blindUp();
            element.style.display = "none";
        }
    });

    var select = $("problem_" + $("categories").value);
    if (select) {
        select.name = "problem";
        // select.style.display = "inline";
        $(select).appear();
    }
}

function browserSupportsAudio() {
    if (Prototype.Browser.Gecko && navigator.userAgent.indexOf("Win") > 0) {
        if (!navigator.plugins || !$A(navigator.plugins).detect(function(p) {
            return p.name.indexOf('QuickTime') != -1;
        })) {
            return false;
        }
    }
    return true;
}

// draws mouse position within drawingpanel output image
function drawingPanelImageMouseMove(event) {
    var x = event.pointerX();
    var y = event.pointerY();
    if (this.cumulativeOffset) {
        var offset = this.cumulativeOffset();
        x -= offset[0];
        y -= offset[1];
    }

    var table = this.up("table");
    if (!table) { return; }
    var mousePosArea = table.select(".drawingpanelmouseposition")[0];
    if (!mousePosArea) { return; }
    mousePosArea.update("(" + x + ", " + y + ")");
}

function dump(obj, verbose) {
    if ($("dumparea")) {
        $("dumparea").update(getDumpText(obj, verbose));
    } else {
        alert(getDumpText(obj, verbose));
    }
}

function encodeForUrl(str) {
    // return encodeURIComponent(str);
    return str;
}

// repairs cross-browser event bullshit
// similar to Prototype's Event.extend
function EventExtend(event) {
    if (!event) {
        event = window.event; // IE sucks
    }
    Event.extend(event);
    if (!event) {
        return event;
    }

    var keyCode = undefined;
    try {
        var keyCode = event.keyCode;
    } catch (e) {
        try {
            var keyCode = event.which;
        } catch (e2) {}
    }

    try {
        event.abort = function() {
            this.stopped = true;
            try {
				if (typeof(this.preventDefault) == "function") {
                    this.preventDefault();
                }
            } catch (e) {
            }

            try {
                if (typeof(this.stopPropagation) == "function") {
                    this.stopPropagation();
                }
            } catch (e) {
            }

            try {
                if (typeof(this.stop) == "function") {
                    this.stop();
                }
            } catch (e) {
            }

            return false;
        };

        event.KEY_RETURN = 13;
        event.KEY_ENTER = 13;
        event.KEY_TAB = 9;
        event.KEY_ESCAPE = 27;

        event.which = keyCode;
        event.keyCode = keyCode;
    } catch (e) {}

    return event;
}

function getDumpText(obj, verbose) {
    var text = "";
    if (obj === undefined) {
        text = "undefined";
    } else if (obj === null) {
        text = "null";
    } else if (typeof (obj) == "string") {
        var result = "string(length=" + obj.length + "): " + LINE_SEPARATOR_OUTPUT + "\"";
        for ( var i = 0; i < Math.min(10000, obj.length); i++) {
            var c = obj.charAt(i).toPrintableChar();
            result += c;
            if (obj.charAt(i) == "\n") {
                result += LINE_SEPARATOR_OUTPUT;
            }
        }
        result += "\"";
        if (verbose) {
            // display details about each index and character
            for ( var i = 0; i < Math.min(10000, obj.length); i++) {
                if (i % 5 == 0) {
                    result += LINE_SEPARATOR_OUTPUT;
                }
                result += "  " + ("" + i).padL(3) + ": " +
                        obj.charAt(i).toPrintableChar().padL(2) + " (" +
                        ("" + obj.charCodeAt(i)).padL(3) + ")   ";
            }
        }
        return result;
    } else if (typeof (obj) != "object") {
        return typeof (obj) + ": " + obj;
    } else {
        text = "object {";
        var props = [];
        try {
            for (var prop in obj) {
                if (prop) {
                    props.push(prop);
                }
            }
        } catch (e) {
            // IE can't enumerate the properties of some objects e.g. XML DOM nodes
            text += getDumpText(e, verbose);
        }

        props.sort();

        // add each property's name and value to the string
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            try {
                if (prop == prop.toUpperCase()) {
                    continue;
                } // skips constants; dom objs have lots of them
                text += LINE_SEPARATOR + "  " + prop + "=";
                if (prop.match(/innerHTML/)) {
                    text += "[inner HTML, omitted]";
                } else if (obj[prop] && ("" + obj[prop]).match(/function/)) {
                    text += "[function]";
                } else {
                    text += obj[prop];
                }
            } catch (e) {
                text += "error accessing property '" + prop + "': " + e + LINE_SEPARATOR;
            }
        }

        if (text.charAt(text.length - 1) != "{") {
            text += LINE_SEPARATOR;
        }
        text += "}";
    }
    return text;
}

function getFormQueryParams(formElement) {
    var queryParams = {};
    var kids = formElement.select("input, textarea, select");
    for ( var i = 0; i < kids.length; i++) {
        var kid = kids[i];
        if (kid.name) {
            if (isTagName(kid, "input") && kid.type == "radio" && !kid.checked) {
                // special case: input type="radio"
                if (!queryParams[kid.name]) {
                    // if this parameter's value is empty, just fill it in with "" as a placeholder
                    queryParams[kid.name] = "";
                }
            } else if (isTagName(kid, "input") && kid.type == "checkbox" && !kid.checked) {
                // special case: input type="checkbox"
                // if unchecked, shouldn't be included in parameters submitted
            } else {
                queryParams[kid.name] = kid.value;
            }
        }
    }

    return queryParams;
}

// cross-browser way to get text out of an element/control
function getTextContent(element) {
    try {
        if (element.value !== undefined) {
            return element.value;
        } else if (element.textContent !== undefined) {
            return element.textContent;
        } else if (element.innerText !== undefined) {
            return element.innerText;
        } else if (element.firstChild !== undefined && element.firstChild.nodeValue !== undefined) {
            return element.firstChild.nodeValue;
        }
    } catch (e) {}

    return null;
}

function isTagName(element, tagName) {
    if (!element) {
        return false;
    } else if (!tagName || tagName == "*") {
        return true;
    }

    var nodeName = element.nodeName.toLowerCase();
    if (tagName) {
        tagName = tagName.toLowerCase();
    }
    return nodeName == tagName;
}

function isTomcatError(ajax) {
    return ajax.status == 500 ||
            (ajax.responseText && ajax.responseText.indexOf("Apache Tomcat") >= 0 &&
            ajax.responseText.indexOf("Error report") >= 0);
}


function Arrays() {}

Arrays.create = function(length) {
    var a = new Array(length || 0);

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < length; i++) {
            a[i] = Arrays.create(args);
        }
    }

    return a;
};

/** Rearranges the contents of the given array into random order, in-place. */
Arrays.shuffle = function(array) {
	for (var i = 0; i < array.length - 1; i++) {
		var j = Math.floor(Math.random() * (array.length - i)) + i;
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
};


function Exceptions() {}

Exceptions.getStackTrace = function(e) {
    var callstack = [];
    var isCallstackPopulated = false;
    if (e.stack) {    // Firefox
        var lines = e.stack.split('\n');
        for (var i=0, len=lines.length; i<len; i++) {
            if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
                callstack.push(lines[i]);
            }
        }

        // Remove call to getStackTrace()
        callstack.shift();
        isCallstackPopulated = true;
    } else if (window.opera && e.message) {   // Opera
        var lines = e.message.split('\n');
        for (var i=0, len=lines.length; i<len; i++) {
            if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
                var entry = lines[i];
                // Append next line also since it has the file info
                if (lines[i+1]) {
                    entry += ' at ' + lines[i+1];
                    i++;
                }
                callstack.push(entry);
            }
        }

        // Remove call to printStackTrace()
        callstack.shift();
        isCallstackPopulated = true;
    }

    if (!isCallstackPopulated) {   // IE and Safari
        var currentFunction = arguments.callee.caller;
        if (currentFunction) {
            var fn = currentFunction.toString();
            var startIndex = fn.indexOf("function") + 8;
            var fname = fn.substring(startIndex, fn.indexOf('(', startIndex)).trim() || 'anonymous';
            if (typeof(e.filename) !== "undefined") {
                fname = e.filename.replace(/.*\//, "") + "." + fname;
            }
            if (typeof(e.lineNumber) !== "undefined") {
                fname += ":" + e.lineNumber;
            }
            callstack.push(fname);
            currentFunction = currentFunction.caller;
        }

        while (currentFunction) {
            var fn = currentFunction.toString();
            var startIndex = fn.indexOf("function") + 8;
            var fname = fn.substring(startIndex, fn.indexOf('(', startIndex)).trim() || 'anonymous';
            callstack.push(fname);
            currentFunction = currentFunction.caller;
        }
    }
    return callstack.join("\n");
};


// BEGIN CODE STOLEN FROM GRADE-IT AND MARTY'S VARIOUS OTHER PROJECTS

function Events() {}

/** Calls the given function when the given link is clicked.
 *  Also sets the href of the link so that the cursor becomes a hand when hovering on it.
 */
Events.addLinkListener = function(link, fn, setHref) {
    if (!link) {
        return;
    }
    if (typeof(link) == "string") {
        link = $(link);
    }
    link.observe("click", fn);
    if (!link.href && setHref !== false) {
        link.href = "#";   // so that the cursor will turn into a lil hand
    }
};

function Page() {}

/** Returns the current page's HTML query string parameters as a [key -> value] hash. */
Page.getQueryString = function(replacements) {
    var url = window.location.search.substring(1);
    var chunks = url.split(/&/);
    var hash = {};
    for (var i = 0; i < chunks.length; i++) {
        var keyValue = chunks[i].split("=");
        if (keyValue[0] && keyValue[1]) {
            // remove annoying query params that UW inserts
            if (keyValue[0].match(/^__ut/)) {
                continue;
            }
            hash[keyValue[0]] = keyValue[1];
        }
    }
    if (replacements) {
        for (var key in replacements) {
            if (key) {
                hash[key] = replacements[key];
            }
        }
    }
    return hash;
};

/** Turns a 'buttonlink' into a clickable button. */
Page.makeLinkIntoButton = function(linkElement, fn) {
    if (!linkElement || !fn) {
        return;
    }
    if (!linkElement.href) {
        linkElement.href = "#";  // so we get the "hand" cursor when hovering
    }
    linkElement.observe("click", fn);
};

/** Returns an HTML-decoded version of the given string. */
String.prototype.htmlDecode = function() {
    var str = this;
    str = str.replace(/&amp;/gi, "&");
    str = str.replace(/&lt;/gi, "<");
    str = str.replace(/&gt;/gi, ">");
    str = str.replace(/&nbsp;/gi, " ");
    str = str.replace(/&quot;/gi, "\"");
    str = str.replace(/\u00A0/gi, " "); // stupid non-breaking space character on Safari
    str = str.replace(/\r\n/gi, LINE_SEPARATOR); // stupid line breaks in IE/Opera
    return str;
};

/** Returns an HTML-encoded version of the given string.
 *  Not very good; just gets the major stuff like < > "
 */
String.prototype.htmlEncode = function(skipSpaces) {
    var str = this;
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/>/g, "&gt;");
    if (!skipSpaces) {
        str = str.replace(/ /g, "&nbsp;");
    }
    str = str.replace(/\"/g, "&quot;");
    return str;
};

String.prototype.isSpace = function() {
    return this.length == 1 && this.charCodeAt(0) <= " ".charCodeAt(0) || this.charCodeAt(0) == 160;
}

/**
 * Returns the Levenshtein edit distance between the two given strings;
 * the number of characters that must be added, removed, or modified to
 * turn the one string into the other.
 * Case-insensitive.
 * @see http://en.wikipedia.org/wiki/Levenshtein_distance
 */
String.prototype.levenshtein = function(s2, caseInsensitive) {
	var s1 = this;
	if (caseInsensitive) {
		s1 = s1.toUpperCase();
		s2 = s2.toUpperCase();
	}

	var matrix = Arrays.create(s1.length + 1, s2.length + 1);
	for (var i = 0; i <= s1.length; i++) {
		for (var j = 0; j <= s2.length; j++) {
			matrix[i][j] = 0;
		}
	}

	for (var i = 0; i <= s1.length; i++) {
		matrix[i][0] = i;
	}
	for (var j = 0; j <= s2.length; j++) {
		matrix[0][j] = j;
	}

	for (var j = 1; j <= s2.length; j++) {
		for (var i = 1; i <= s1.length; i++) {
			if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = 1 + Math.min(matrix[i - 1][j],
						Math.min(matrix[i][j - 1], matrix[i - 1][j - 1]));
			}
		}
	}

	return matrix[matrix.length - 1][matrix[0].length - 1];
};

/** Deletes whitespace from the front of the given string. */
String.prototype.ltrim = function() {
    for (var k = 0; k < this.length && this.charAt(k).isSpace(); k++) {
    }
    return this.substring(k, this.length);
};

/** Inserts padding at the front of the given string until it reaches the given length,
 *  then returns the padded string.  If no padding string is passed, the padding will
 *  default to spaces.
 */
String.prototype.padL = function(length, padding) {
    var str = this;
    while (str.length < length) {
        str = (padding ? padding : " ") + str;
    }
    return str;
};

/** Inserts padding at the back of the given string until it reaches the given length,
 *  then returns the padded string.  If no padding string is passed, the padding will
 *  default to spaces.
 */
String.prototype.padR = function(length, padding) {
    var str = this;
    while (this.length < length) {
        str = str + (padding ? padding : " ");
    }
    return str;
};

/** Deletes whitespace from the end of the given string. */
String.prototype.rtrim = function() {
    for (var j = this.length - 1; j >= 0 && this.charAt(j).isSpace(); j--) {
    }
    return this.substring(0, j + 1);
};

/** Converts escape sequences into visible characters. */
String.prototype.toPrintableChar = function() {
    if (this == "\n") {
        return "\\n";
    } else if (this == "\r") {
        return "\\r";
    } else if (this == "\t") {
        return "\\t";
    } else if (this == " " && isIE()) {
        return "&nbsp;";
    } else {
        return this;
    }
};

/** Deletes whitespace from the front and end of the given string. */
String.prototype.trim = function() {
    return this.ltrim().rtrim();
};

/** Returns true if the current web browser is any version of IE. */
function isIE() {
    return navigator.appName.match(/Internet Explorer/);
}

/** Returns true if the current web browser is any version of Apple Safari. */
function isSafari() {
    return navigator.userAgent.indexOf('AppleWebKit') >= 0;
}




/**
* code stolen from
* http://github.com/kangax/protolicious/blob/5b56fdafcd7d7662c9d648534225039b2e78e371/event.simulate.js
*
* Event.simulate(@element, eventName[, options]) -> Element
*
* - @element: element to fire event on
* - eventName: name of event to fire (only MouseEvents and HTMLEvents interfaces are supported)
* - options: optional object to fine-tune event properties - pointerX, pointerY, ctrlKey, etc.
*
* $('foo').simulate('click'); // => fires "click" event on an element with id=foo
*
**/

(function(){

    var eventMatchers = {
        'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
        'MouseEvents': /^(?:click|mouse(?:down|up|over|move|out))$/
    }
    var defaultOptions = {
        pointerX: 0,
        pointerY: 0,
        button: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        bubbles: true,
        cancelable: true
    }

    Event.simulate = function(element, eventName) {
        var options = Object.extend(defaultOptions, arguments[2] || { });
        var oEvent, eventType = null;

        element = $(element);

        for (var name in eventMatchers) {
            if (eventMatchers[name].test(eventName)) {
                eventType = name;
                break;
            }
        }

        if (!eventType) {
            throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');
        }

        if (document.createEvent) {
            oEvent = document.createEvent(eventType);
            if (eventType == 'HTMLEvents') {
                oEvent.initEvent(eventName, options.bubbles, options.cancelable);
            }
            else {
                oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
                    options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
                    options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, element);
            }
            element.dispatchEvent(oEvent);
        }
        else {
            options.clientX = options.pointerX;
            options.clientY = options.pointerY;
            oEvent = Object.extend(document.createEventObject(), options);
            element.fireEvent('on' + eventName, oEvent);
        }
        return element;
    };

    Element.disableLink = function(element) {
        if (!element || element.disabled) {
            return element;
        }

        element.disabled = true;
        //element.oldBG = element.getStyle("background-color");
        element.oldFG = "black";
        if (typeof(element.getStyle) !== "undefined") {
            // BUGFIX: element foreground colors were not being restored after disable/re-enable
            element.oldFG = element.getStyle("color");
        }
        //element.style.backgroundColor = "#ccc";
        element.style.color = "#888";

        // if element is a link (a), must turn off its href for now
        if (element.tagName && element.tagName.toLowerCase() == "a") {
            // element.oldHref = element.href;
            // element.href = "";
        }

        return element;
    };

    Element.enableLink = function(element) {
        if (!element || !element.disabled) {
            return element;
        }

        element.disabled = false;
        //element.style.backgroundColor = element.oldBG;
        element.style.color = element.oldFG;

        // if element is a link (a), must turn back on its href
        if (element.tagName && element.tagName.toLowerCase() == "a") {
            // element.href = element.oldHref;
            // element.oldHref = undefined;
        }

        return element;
    };

    Element.linkIsEnabled = function(element) {
        if (!element) {
            return element;
        }
        return !element.disabled;
    };

    Element.tooltip = function(element, tooltipText, autoHide, timeout) {
        if (!tooltipText) {
            if (!element.title) {
                return element;
            }
            tooltipText = "&nbsp;&nbsp;" + element.title + "&nbsp;&nbsp;";
        }

        var tooltip = document.createElement("span");
        tooltip.innerHTML = tooltipText;
        tooltip.className = "tooltip";

        var offset = element.cumulativeOffset();
        // tooltip.style.position = "fixed";
        tooltip.style.left = offset.left + 2 + "px";
        tooltip.style.top = offset.top + element.getHeight() + 2 + "px";

        // changed tooltip positioning to be closer to the original element
        // (old code failed when element was wrapped inside a position:abs/rel element)
        // tooltip.style.top = "20px";

        // element.parentNode.insertBefore(tooltip, element.nextSibling === undefined ? element : element.nextSibling);
        document.body.appendChild(tooltip);

        var hideTooltip = function() {
            new Effect.BlindLeft(tooltip);
        };

        // Why would anybody ever not auto-hide?
        if (true || autoHide) {
            if (!timeout) {
                timeout = 5000;
            }
            setTimeout(hideTooltip, timeout);
        }

        var highlightCount = 3;
        var highlightAgainObj = {
        	afterFinish: function() {
        		tooltip.highlight();
        	}
        };
        tooltip.highlight(highlightAgainObj);


        return tooltip;
    };

    Element.addMethods({
        simulate: Event.simulate,
        disableLink: Element.disableLink,
        enableLink: Element.enableLink,
        linkIsEnabled: Element.linkIsEnabled,
        tooltip: Element.tooltip
    });
})();


/** Ruh-Roh, Marty's adding to Scriptaculous now */
Effect.BlindRight = function(element) {
    element = $(element);
    var elementDimensions = element.getDimensions();
    return new Effect.Scale(element, 100, Object.extend({
        scaleContent: false,
        scaleY: false,
        scaleFrom: 0,
        scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
        restoreAfterFinish: true,
        afterSetup: function(effect) {
            effect.element.makeClipping().setStyle({
                width: '0px',
                height: effect.dims[0] + 'px'
            }).show();
        },
        afterFinishInternal: function(effect) {
            effect.element.undoClipping();
        }
    }, arguments[1] || { }));
};

Effect.BlindLeft = function(element) {
    element = $(element);
    element.makeClipping();
    return new Effect.Scale(element, 0,
        Object.extend({
            scaleContent: true,
            restoreAfterFinish: true,
            afterFinishInternal: function(effect) {
                effect.element.hide().undoClipping();
            }
        }, arguments[1] || { })
    );
};


/** Ruh-Roh, Marty's adding to Scriptaculous now */
Effect.BlindBoth = function(element) {
    element = $(element);
    var elementDimensions = element.getDimensions();
    return new Effect.Scale(element, 100, Object.extend({
        scaleContent: false,
        /* scaleY: false, */
        scaleFrom: 0,
        scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
        restoreAfterFinish: true,
        afterSetup: function(effect) {
            effect.element.makeClipping().setStyle({
                width: '0px',
                height: '0px'    /* effect.dims[0] + 'px' */
            }).show();
        },
        afterFinishInternal: function(effect) {
            effect.element.undoClipping();
        }
    }, arguments[1] || { }));
};
