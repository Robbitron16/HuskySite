/**
 * This is the JS code to support problem.jsp, the page that shows when
 * the user is working on solving a particular problem.
 *
 * history:
 * - 2010/12/28: removed a lot of code now that mechanical problems evaluate on server;
 *               clear button;
 *               now warns student if he tries to navigate away from page after changing code;
 *
 */

(function() {
	// names I'll use for various UI settings in browser cookies
	// (apparently IE doesn't like underscores in cookie names? wtf ie?)
	var INDENT_SPACES_COOKIE_NAME = "practiceitindentspaces";
	var INDENT_SPACE_COUNT_COOKIE_NAME = "practiceitindentspacecount";
	var INDENT_TABS_COOKIE_NAME = "practiceitindenttabs";
	var SOUND_COOKIE_NAME = "practiceitsound";
	var SYNTAX_HIGHLIGHTING_COOKIE_NAME = "practiceitsyntaxhighlighting";
	var TIMED_QUIZ_START_COOKIE_NAME = "practiceittimedquizstart";

	var timedQuizTimerID = null;
	var hasAlertedAboutAudio = false;
	var codeMirror = null;

	var fbUserID = null;
	var fbAccessToken = null;

	// window load
	document.observe("dom:loaded", function() {
		// don't set up event handling if AdBlock is enabled
		if (ANGRY_AD_FAIL) {
			return;
		}

		// disable browser's spell-checking, if it has any (FF)
		if ($("solution")) {
			$("solution").spellcheck = false;

			// handle key presses to listen for Enter or Tab
			$("solution").observe("keydown", solutionKeyDown);
			$("solution").observe("keypress", solutionKeyPress);
			// $("solutionform").observe("submit", solutionSubmit);
			// Page.makeLinkIntoButton($("shorter"), shorterClick);
			// Page.makeLinkIntoButton($("taller"), tallerClick);
			Page.makeLinkIntoButton($("indent"), indentClick);
		}

		if ($("solutionsubmit")) {
			Page.makeLinkIntoButton($("solutionsubmit"), solutionSubmitClick);
		}

		if ($("showsolutionlink")) {
			$("showsolutionlink").observe("click", showSolutionClick);
		}

		if ($("showhintslink")) {
			Page.makeLinkIntoButton($("showhintslink"), showHintsClick);
		}

		if ($("clearlink")) {
			Page.makeLinkIntoButton($("clearlink"), clearClick);
		}

		if ($("stripcomments")) {
			$("stripcomments").observe("click", stripCommentsClick);
		}

		if ($("indentspaces")) {
			$("indentspaces").observe("change", indentSpacesClick);
			$("indenttabs").observe("change", indentTabsClick);
			$("indentspacecount").observe("change", indentSpacesClick);
			$("indentspacecount").observe("focus", indentSpacesClick);
			$("indentspacecount").observe("blur", indentSpacesClick);

			Cookies.makeRadioButtonStateful($("indentspaces"), INDENT_SPACES_COOKIE_NAME);
			Cookies.makeRadioButtonStateful($("indenttabs"), INDENT_TABS_COOKIE_NAME);
			Cookies.makeTextBoxStateful($("indentspacecount"), INDENT_SPACE_COUNT_COOKIE_NAME);

			if (isHtmlProblem()) {
				$("indent").disableLink();
			} else {
				// auto-indent code initially
				if (getSolutionCode()) {
					// setSolutionCode(indent(getSolutionCode(), TAB_STRING));
				}
			}
		}

		if ($("controlsarea")) {
			if (!$("userinfoarea")) {
				$("controlsarea").hide();
			} else if ($("controlsarea").visible() && $("controlsarea").getStyle("display") != "none") {
				if ($("sound")) {
					Cookies.makeCheckboxStateful($("sound"), SOUND_COOKIE_NAME);
				}
				if ($("syntaxhighlighting")) {
					Cookies.makeCheckboxStateful($("syntaxhighlighting"), SYNTAX_HIGHLIGHTING_COOKIE_NAME);
					codeMirrorToggle();
					$("syntaxhighlighting").observe("change", codeMirrorToggle);
				}
			} else {
				if ($("sound")) {
					$("sound").checked = false;
				}
				if ($("syntaxhighlighting")) {
					$("syntaxhighlighting").checked = false;
				}
			}
		}

		Page.makeLinkIntoButton($("hidedescription"), hideDescriptionClick);

		// drawing panel problems
		$$(".drawingpanelarea img.output").each(function(image) {
			image.observe("mousemove", drawingPanelImageMouseMove);
			image.hasMouseObserver = true;
		});

		if ($("solvedstatus")) {
			// $("solvedstatus").tooltip(undefined, true, 10000);
		}

		// timed quiz event hookup
		if (isTimedQuiz()) {
			// if the quiz has just begun, record the start time
			if (!Cookies.get(TIMED_QUIZ_START_COOKIE_NAME)) {
				var date = new Date();
				Cookies.set(TIMED_QUIZ_START_COOKIE_NAME, date.getTime().toString(), 1);
			}

			if (!isTimeUp()) {
				updateTimer();
				timedQuizTimerID = setInterval(updateTimer, 5000);
			}
		}

		if ($("timedquizturninbutton")) {
			$("timedquizturninbutton").observe("click", turninQuizClick);
		}

		$$(".popuplink").each(function(element) {
			element.target = "_blank";
		});

		// save solution text string to make sure value has not changed later
		if ($("solution")) {
			updateTabString();
			$("solution").initialValue = getSolutionCode();
		}

		if ($("htmldiffslider")) {
			$("htmldifftogglebutton").observe("click", htmlDiffToggleClick);
			$("htmldiffslider").observe("change", htmlDiffSliderChange);
			htmlDiffSliderChange();
			htmlDiffEqualizeSize();
		}

		if ($("likelink")) {
			$("likelink").observe("click", likeLinkClick);
		}

		if ($("revertlink")) {
			$("revertlink").observe("click", revertLinkClick);

		}

		if (!!$("facebooklogin")) {
			// This is code to support integration with the Facebook API
			$("facebookloginbutton").observe("click", function() {
				event = EventExtend(event); // IE sucks
				event.preventDefault();
				event.abort();
				FB.login(displayFacebookLoginStatusBasedOnResponse);
				return false;
			});

			window.fbAsyncInit = function() {
				// init the FB JS SDK
				FB.init({
					appId     : "539343632745486", // App ID from the App Dashboard
					channelUrl: "http://practiceit.cs.washington.edu/channel.html", // Channel File for x-domain communication
					status    : true, // check the login status upon init?
					cookie    : true, // set sessions cookies to allow your server to access the session?
					xfbml     : true, // parse XFBML tags on this page?
					oauth     : true  // ?
				});

				// Additional initialization code such as adding Event Listeners goes here
				displayFacebookLoginStatus(true);
				FB.Event.subscribe("auth.statusChange", displayFacebookLoginStatusBasedOnResponse);
			};

			// Load the SDK's source Asynchronously
			// Note that the debug version is being actively developed and might
			// contain some type checks that are overly strict.
			// Please report such bugs using the bugs tool.
			(function(d, debug) {
				var js, id = "facebook-jssdk", ref = d.getElementsByTagName("script")[0];
				if (d.getElementById(id)) {return;}
				js = d.createElement("script"); js.id = id; js.async = true;
				js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
				ref.parentNode.insertBefore(js, ref);
			}(document, /*debug*/ false));
		}

		window.onbeforeunload = windowBeforeUnload;
	});

	// Turns off the CodeMirror syntax highlighter on the main solution text box.
	function codeMirrorDisable() {
		if (codeMirror) {
			codeMirror.toTextArea();
			codeMirror = null;
		}
	}

	// Initializes the CodeMirror syntax highlighter on the main solution text box.
	function codeMirrorInit() {
		if (typeof(CodeMirror) != "undefined" && $("solution")) {
			var language = ($("language") && $("language").innerHTML.toLowerCase().strip()) || "text";
			var mode = "text";
			var modes = {
				"c": "text/x-c++src",
				"cc": "text/x-c++src",
				"cpp": "text/x-c++src",
				"c++": "text/x-c++src",
				"cs": "text/x-csharp",
				"h": "text/x-c++src",
				"hpp": "text/x-c++src",
				"css": "css",
				"htm": "htmlmixed",
				"html": "htmlmixed",
				"shtml": "htmlmixed",
				"rhtml": "htmlmixed",
				"java": "text/x-java",
				"js": "javascript",
				"json": "javascript",
				"php": "php",
				"py": "python",
				"rb": "ruby",
				// "scm": "scheme",
				"xml": "xml"
			};
			for (var m in modes) {
				if (modes.hasOwnProperty(m)) {
					if (language == m) {
						mode = modes[m];
						break;
					}
				}
			}

			if (typeof(CodeMirror) == "function") {
				// http://codemirror.net/doc/manual.html
				codeMirror = CodeMirror.fromTextArea($("solution"), {
					indentUnit: 4,
					tabSize: 4,
					"mode": mode,
					smartIndent: true,
					indentWithTabs: false,
					electricChars: true,
					lineNumbers: true,
					showCursorWhenSelecting: true,
					matchBrackets: true,
					undoDepth: 99,
					autofocus: false,
					extraKeys: {
						"Tab": "indentMore",
						"Shift-Tab": "indentLess"
					}
				});
			}
		}
	}

	// Turns CodeMirror syntax highlighting on/off as checkbox is checked.
	function codeMirrorToggle() {
		if ($("syntaxhighlighting") && $("syntaxhighlighting").checked) {
			codeMirrorInit();
		} else {
			codeMirrorDisable();
		}
	}

	// returns whether or not Facebook features should be used on this page
	function facebookEnabled(force) {
		return !!$("facebooklogin") && (force || typeof(FB) !== "undefined");
	}

	function displayFacebookLoginStatus(force) {
		if (facebookEnabled(force)) {
			FB.getLoginStatus(displayFacebookLoginStatusBasedOnResponse, force);
		}
	}

	function displayFacebookLoginStatusBasedOnResponse(response) {
		$("facebookcheckingstatus").hide();
		if (response.status == "connected") {
			// they are logged in and have authorized my app to talk to their FB
			fbUserID = response.authResponse.userID;
			fbAccessToken = response.authResponse.accessToken;
			$("facebooknotauthorized").hide();
			$("facebooknotloggedin").hide();
			$("facebookconnected").show();
		} else if (response.status == "not_authorized") {
			// they are logged in but have not authorized my app to post to their FB profile
			$("facebookconnected").hide();
			$("facebooknotloggedin").hide();
			$("facebooknotauthorized").show();
		} else {
			// not_logged_in; not connected to FB so we don't know if they have authorized the app
			$("facebookconnected").hide();
			$("facebooknotauthorized").hide();
			$("facebooknotloggedin").show();
		}
	}

	function getSolutionCode() {
		if (codeMirror) {
			return codeMirror.getValue();
		} else if ($("solution")) {
			return $("solution").value;
		} else {
			return "";
		}
	}

	function setSolutionCode(code) {
		if (codeMirror) {
			codeMirror.setValue(code);
		} else if ($("solution")) {
			$("solution").value = code;
		}
	}

	//check whether the given element's answer is correct;
	//apply a "correct" or "incorrect" style appropriately
	function checkCorrect(element, event, skipSound) {
		var solutionsHidden = element.up("td").select(".solutionhidden");
		var solutionsHiddenNoWhitespace = element.up("td").select(".solutionhidden_nowhitespace");

		// array of all solutions, all solutions with whitespace stripped, and
		// with "type" stripped (.0 for doubles; "" for strings, etc.)
		var correctAnswers = [];
		var correctAnswersNoWhitespace = [];
		var correctAnswersNoType = [];

		for (var i = 0; i < solutionsHidden.length; i++) {
			var correctAnswer = getTextContent(solutionsHidden[i]).htmlDecode().strip();
		correctAnswer = correctAnswer.replace(/[ ]+\r?\n/gi, LINE_SEPARATOR_OUTPUT);  // strip trailing spaces
		correctAnswers.push(correctAnswer);

		if (solutionsHiddenNoWhitespace && i < solutionsHiddenNoWhitespace.length) {
			var answerNoWhitespace = getTextContent(solutionsHiddenNoWhitespace[i]).htmlDecode().replace(/\s+/gi, "");
			correctAnswersNoWhitespace.push(answerNoWhitespace);
		}

		var correctAnswerNoType = correctAnswer.toLowerCase().replace(/\s+/gi, "").replace(/\"/g, "").replace(/\.0|\.$/g, "");
		correctAnswersNoType.push(correctAnswerNoType);
		}

		var studentAnswer = element.value.htmlDecode().strip();
		studentAnswer = studentAnswer.replace(/[ ]+\r?\n/gi, LINE_SEPARATOR_OUTPUT);
		var studentAnswerNoWhitespace = studentAnswer.replace(/\s+/gi, "");   // some questions ignore all whitespace
		var studentAnswerNoType = studentAnswerNoWhitespace.toLowerCase().replace(/\"/g, "").replace(/\.0|\.$/g, "");

		if (COLLAPSE_MULTIPLE_SPACES) {
			// collapse groups of multiple spaces into a single space
			// (useful for inheritance mystery problems)
			studentAnswer = studentAnswer.replace(/[ ]+/gi, " ");
			for (var i = 0; i < correctAnswers.length; i++) {
				correctAnswers[i] = correctAnswers[i].replace(/[ ]+/gi, " ");
			}
		}

		// strip out the "ignore" pattern (if any)
		var ignorePattern = "";
		var ignoreElement = element.up("td").select(".ignore");
		if (ignoreElement && ignoreElement.length > 0) {
			ignorePattern = getTextContent(ignoreElement[0]).htmlDecode();

			if (ignorePattern) {
				var ignoreRegExp = new RegExp(ignorePattern, "gi");
				studentAnswer = studentAnswer.replace(ignoreRegExp, "");
				for (var i = 0; i < correctAnswers.length; i++) {
					correctAnswers[i] = correctAnswers[i].replace(ignoreRegExp, "");
				}
			}
		}

		// some problems' XML specifies that they should ignore casing
		if (element.hasClassName("ignorecase")) {
			studentAnswer = studentAnswer.toLowerCase();
			for (var i = 0; i < correctAnswers.length; i++) {
				correctAnswers[i] = correctAnswers[i].toLowerCase();
			}
		}


		var correct = true;
		var almost  = false;  // studentAnswerNoType == correctAnswerNoType;
		var changed = false;

		var td = element.up(".expressionarea")
		if (!td) {
			td = element.up("td");
		}
		if (!td) {
			td = parent;
		}

		// now that info is gathered, figure out whether this is correct, incorrect, or "almost"
		// (correct except for bad type)
		if (!studentAnswer && correctAnswers.indexOf(studentAnswer) < 0) {
			// blank; must be wrong
			element.removeClassName("correct");
			element.removeClassName("incorrect");
			element.removeClassName("almost");
			td.removeClassName("correct");
			td.removeClassName("incorrect");
			td.removeClassName("almost");
			correct = false;
		} else if (correctAnswers.indexOf(studentAnswer) >= 0 ||
			(correctAnswersNoWhitespace.indexOf(studentAnswerNoWhitespace) >= 0)) {
			// right answer
			if (!td.hasClassName("correct")) {
				changed = true;
			}
			element.addClassName("correct");
			element.removeClassName("incorrect");
			element.removeClassName("almost");
			td.addClassName("correct");
			td.removeClassName("incorrect");
			td.removeClassName("almost");
		} else if (correctAnswersNoType.indexOf(studentAnswerNoType) >= 0) {
			// nearly correct answer (wrong type, etc.)
			if (!td.hasClassName("almost")) {
				changed = true;
			}
			element.addClassName("almost");
			element.removeClassName("correct");
			element.removeClassName("incorrect");
			td.addClassName("almost");
			td.removeClassName("correct");
			td.removeClassName("incorrect");
			correct = false;
			almost = true;
		} else {
			// wrong answer
			if (!td.hasClassName("incorrect")) {
				changed = true;
			}
			element.addClassName("incorrect");
			element.removeClassName("correct");
			element.removeClassName("almost");
			td.addClassName("incorrect");
			td.removeClassName("correct");
			td.removeClassName("almost");
			correct = false;
		}

		element.stale = false;
		return correct;
	}

	/**
	 * Called when the Clear button is pressed.
	 * Erases all text in solution input boxes on the page.
	 */
	function clearClick(event) {
		abortEvent(event);
		if (!confirm("Are you sure you want to clear all solution text on the current page?\n" +
				"Any previous solution you submitted to the server is still saved.")) {
			return false;
		}

		$$("#solution, .expressionanswer").each(function(element) {
			element.value = "";
		});

		$$(".multiplechoiceanswer").each(function(element) {
			element.checked = false;
		});

		return false;
	}

	/**
	 * If there is a timed quiz in progress, this function is called every minute.
	 * If the student still has time to complete the quiz, this function updates
	 * the timer with the correct time remaining.  If this function is called when
	 * the student taken the allotted amount of time, their timed quiz client state
	 * is removed (a cookie), the timer is cleared, and they are asked if they would
	 * like to turnin the quiz.
	 */
	function updateTimer() {
		if (isTimeUp()) {
			$("minsremaining").update(0);
			$("hoursremaining").update(0);

			stopTimedQuiz();

			var goToResults = confirm("Your time is up!  Would you like to stop " +
				"working and go to the results page?  If you click \"Cancel\", " +
				"you can continue working as long as you want and we'll tell you " +
				"the total time you used when you click \"Turn quiz in!\".");
			if (goToResults) {
				window.location.href = "timedquizresults.jsp?category=" + window.location.search.toQueryParams()["category"];
			}
		} else {
			var msLeft = msLeftToCompleteQuiz();
			var secsLeft = Math.round(msLeft / 1000);
			var minsLeft = Math.min(59, Math.ceil(secsLeft % 3600 / 60));
			var hoursLeft = Math.floor(secsLeft / 3600);
			$("minsremaining").update(minsLeft);
			$("hoursremaining").update(hoursLeft);
		}
	}

	function hideDescriptionClick(event) {
		abortEvent(event);
		if (this.disabled) {
			return abortEvent(event);
		}
		this.disableLink();
		var that = this;

		var options = {
			afterFinish: function() {
				that.enableLink();
			}
		};

		if ($("description").style.display == "none") {
			Effect.BlindDown("description", options);
		} else {
			Effect.BlindUp("description", options);
		}

		return abortEvent(event);
	}

	function htmlDiffSliderChange(event) {
		var percent = $("htmldiffslider").value;   // 0-100% of actual value's opacity
		// $("expectedhtmloutput").style.opacity = percent / (100 - percent) / 100.0;
		$("actualhtmloutput").style.visibility = (percent == 0) ? "hidden" : "visible";
		$("actualhtmloutput").style.opacity = percent / 100.0;
	}

	function getInnerWidth(element) {
		if (!element) { return 0; }
		var w = element.getWidth() || 0;
		var pleft = parseInt(element.getStyle("padding-left")) || 0;
		var pright = parseInt(element.getStyle("padding-right")) || 0;
		var bwleft = parseInt(element.getStyle("border-width-left")) || 0;
		var bwright = parseInt(element.getStyle("border-width-right")) || 0;
		return w - pleft - pright - bwleft - bwright;
	}

	function getInnerHeight(element) {
		if (!element) { return 0; }
		var h = element.getHeight() || 0;
		var ptop = parseInt(element.getStyle("padding-top")) || 0;
		var pbottom = parseInt(element.getStyle("padding-bottom")) || 0;
		var bwtop = parseInt(element.getStyle("border-width-top")) || 0;
		var bwbottom = parseInt(element.getStyle("border-width-bottom")) || 0;
		return h - ptop - pbottom - bwtop - bwbottom;
	}

	function htmlDiffEqualizeSize() {
		// equalize width and height of expected vs. actual output
		var width = getInnerWidth($("expectedhtmloutput"));
		$("expectedhtmloutput").style.width = width + "px";
		$("actualhtmloutput").style.width = width + "px";

		var expectedHeight = getInnerHeight($("expectedhtmloutput"));
		var actualHeight = getInnerHeight($("actualhtmloutput"));
		var height = Math.max(expectedHeight, actualHeight);

		$("expectedhtmloutput").style.height = height + "px";
		$("actualhtmloutput").style.height = height + "px";
	}

	function htmlDiffToggleClick(event) {
		var percent = $("htmldiffslider").value;
		if (percent == 0) {
			$("htmldiffslider").value = 100;
		} else {
			$("htmldiffslider").value = 0;
		}
		htmlDiffSliderChange(event);
		return abortEvent(event);
	}

	function indentClick(event) {
		if (this.disabled) {
			return abortEvent(event);
		}
		if (!$("solutionsubmit").hasClassName("HTML")) {
			updateTabString();
			setSolutionCode(indent(getSolutionCode(), TAB_STRING));
		}
		return abortEvent(event);
	}

	// cycle between \t and "   " for tab on Esc press
	function indentSpacesClick(event) {
		if (this.disabled) {
			return abortEvent(event);
		}
		updateTabString();
	}

	// cycle between \t and "   " for tab on Esc press
	function indentTabsClick(event) {
		if (this.disabled) {
			return abortEvent(event);
		}
		TAB_STRING = "\t";
	}

	function isCodeProblem() {
		return $("problemarea") && $("problemarea").hasClassName("codeproblem");
	}

	function isAssertionProblem() {
		return $$("table.assertiontable").length > 0;
	}

	function isExpressionProblem() {
		return $$("table.expressiontable").length > 0;
	}

	function isExpressionProblemSolved() {
		var result = true;

		// make sure all correct answers are chosen
		$$(".expressionanswer").each(function(element) {
			if (result) {
				var td = element.up("td.correct");
				if (!td) {
					result = false;
				}
			}
		});

		return result;
	}

	// Returns true if every expression/assertion on the page has at least got an
	// answer filled into it (even if the answer is not correct).
	function isExpressionProblemAnsweredAll() {
		var result = true;

		// make sure all correct answers are chosen
		$$(".expressionanswer").each(function(element) {
			if (result) {
				if (element.value !== "") {   // looks for non-empty value
					result = false;
				}
			}
		});

		return result;
	}

	function isHtmlProblem() {
		return $("language").innerHTML.strip() == "html" ||
			($("language") && $("language").hasClassName("html")) ||
			($("solutionsubmit") && $("solutionsubmit").hasClassName("html")) ||
			($("description") && $("description").hasClassName("html"));
	}

	// mechanical = any non-coding problem (expressions, mult. choice, assertions)
	function isMechanicalProblem() {
		return isExpressionProblem() || isAssertionProblem() || isMultipleChoiceProblem();
	}

	function isMultipleChoiceProblem() {
		return $$(".multiplechoice").length > 0;
	}

	/**
	 * Whether we are in a timed quiz right now.
	 */
	function isTimedQuiz() {
		return !!$("timerarea");
	}

	/**
	 * Returns whether or not a timed quiz's time is up.  If the problem is not a
	 * part of a timed quiz, true is returned.
	 * @returns {Boolean}
	 */
	function isTimeUp() {
		return msLeftToCompleteQuiz() <= 0;
	}

	function likeLinkClick(event) {
		abortEvent(event);
		$("likelink").disableLink();

		$("likeform").request({
			onSuccess : function(ajax) {
				$("likecountnumber").innerHTML = ajax.responseText;
				if ($("youlikethisproblem")) {
					$("youlikethisproblem").appear();
				}
				$("likelink").enableLink();
				$("likelink").hide();
			},
			onFailure : ajaxFailure,
			onException : ajaxFailure
		});

		return abortEvent(event);
	}

	/**
	 * This function returns the number of milliseconds left in a timed quiz.
	 * -1 is returned if timed quiz is over or problem is not a part of a timed
	 * quiz.
	 */
	function msLeftToCompleteQuiz() {
		var startMs = Cookies.get(TIMED_QUIZ_START_COOKIE_NAME);
		var timeToComplete = parseInt(getTextContent($("timetocomplete")));

		if (!startMs || !timeToComplete) {
			return -1;
		}

		var now = new Date();
		var msLeft = (timeToComplete * 60 * 1000) - (now.getTime() - startMs);

		return msLeft;
	}

	function showPassMessage() {
		if ($("passcountmessage") && !$("passcountmessage").visible()) {
			$("passcountmessage").scrollTo();
			$("passcountmessage").slideDown();

			// update user's total problems solved, if applicable
			updateSolved();

			if ($("passcountmessagespan")) {
				$("passcountmessagespan").highlight({duration: 3.0});
			}

			problemCorrect();   // play sound

			// contact server to tell it that we solved this problem
			if ($("mechanicalproblemsolvedform")) {
				// submit form via Ajax
				$("mechanicalproblemsolvedform").request({
					onFailure: ajaxFailure,
					onException: ajaxFailure
				});
			}
		}
	}

	function hidePassMessage() {
		if ($("passcountmessage") && $("passcountmessage").visible()) {
			$("passcountmessage").slideUp();
			// problemIncorrect();
		}
	}

	// This function is called when the user solved a problem correctly.
	function problemCorrect() {
		// play a congratulatory sound
		if ($("sound") && $("sound").checked) {
			checkSoundSupport();
			var yesSounds = [
					"yes.wav",
					"excellent.wav",
					"cowabunga.wav",
					"vader-skills.wav",
					"vader-obiwan.wav",
					"congratulations.wav",
					"mario-i-got-it.wav",
					"mario-very-good.wav",
					"mario-yippee.wav",
					"homer-woohoo.wav",
					"homer-smart.wav",
					"brilliant.wav"
			];
			var randomSound = yesSounds[parseInt(Math.random() * yesSounds.length)];
			if (Sound) {
				try {
					Sound.play("sounds/" + randomSound, {replace: true});
				} catch (e) {
					console.log(e);
				}
			}
		}

		// potentially post an update to Facebook
		if (typeof(FB) !== "undefined") {
			FB.getLoginStatus(function(response) {
				if (response.status === "connected") {
					// connected
					// response = {status: 'connected', authResponse: {accessToken: '...', expiresIn:'...', signedRequest:'...', userID:'...'}}
					FB.api('/me/practiceit:solve', 'post', {problem: location.href},
							function(response) {
								if (!response || response.error) {
									// alert('Error occured');
								} else {
									// alert('Post ID: ' + response.id);
								}
							}
					);
				}
			});
		}
	}

	// This function is called when the user tries to solve a problem but fails.
	function problemIncorrect() {
		// play a mocking sound
		if ($("sound") && $("sound").checked) {
			checkSoundSupport();
			var noSounds = [
				"no.wav",
				"bogus.wav",
				"woooo.wav",
				"vader-fail.wav",
				"wario-wah.wav",
				"homer-doh.wav",
				"homer-dont-think-so.wav"
			];
			var randomSound = noSounds[parseInt(Math.random() * noSounds.length)];
			if (Sound) {
				try {
					Sound.play("sounds/" + randomSound, {replace: true});
				} catch (e) {
					console.log(e);
				}
			}
		}
	}

	function checkSoundSupport() {
		if (!browserSupportsAudio() && !hasAlertedAboutAudio) {
			alert("Your browser may not support audio playback.  You may need to install a plugin such as QuickTime to enable audio support in your browser.");
			hasAlertedAboutAudio = true;
		}
	}

	function revertLinkClick() {
		if (confirm("This will reset the solution text to its initial state from when you first started the problem.  Are you sure?")) {
			setSolutionCode(getTextContent($("initialvaluereset")));
		}
	}

	function resizeSolution(rows) {
		rows = Math.max(rows, 3);
		$("solution").rows = rows;

		// update line numbers at left
		var lineNumbersText = "";
		for ( var i = 1; i <= rows; i++) {
			lineNumbersText += ("" + i).padL(rows >= 100 ? 3 : 2, isIE() ? "&nbsp;" : " ")
					+ (isIE() ? "<br />" : " \n");
		}
		$("linenumbers").update(lineNumbersText);
	}

	function shorterClick(event) {
		if (this.disabled) {
			return abortEvent(event);
		}
		resizeSolution($("solution").rows - 3);
		return abortEvent(event);
	}

	function showCorrectClick(event) {
		if (this.disabled) {
			return abortEvent(event);
		}
		// grab all expressions or assertions elements from the page
		var expressions = $A($$("table.assertiontable select")).concat(
				$A($$("table.expressiontable input")));

		if (this.checked) {
			// check each one to see if it correct/incorrect
			expressions.each(function(element) {
				checkCorrect(element, undefined, true);
			});

			if (isExpressionProblemSolved()) {
				// user solved this expression/assertion problem!  Congratulate them.
				showPassMessage();
			} else {
				hidePassMessage();
			}
		} else {
			// remove any red/green highlight from page
			hidePassMessage();
			expressions.each( function(element) {
				element.removeClassName("correct");
				element.removeClassName("incorrect");
				var td = element.up("td");
				if (td) {
					td.removeClassName("correct");
					td.removeClassName("incorrect");
				}
			});
		}
	}

	function showSolutionClick(event) {
		abortEvent(event);
		if (this.disabled) {
			return abortEvent(event);
		}

		var unsolved = $("solvedstatus") && $("solvedstatus").hasClassName("unsolved");
		if (unsolved && !confirm("If you peek at the solution, Practice-It won't count this problem toward your total.  Are you sure?")) {
			return abortEvent(event);
		}

		var that = this;
		this.disableLink();

		// fetch solution using Ajax
		// flag them as a dirty stinking cheater
		if (unsolved && $("cheated")) {
			$("cheated").value = "1";
		}

		if ($("solutionloading")) {
			$("solutionloading").style.visibility = "visible";
		}

		// contact the server to get the solutions and put them on the page
		new Ajax.Request(this.href, {
			method :"get",
			onSuccess : function(ajax) {
				if (!ajax.responseXML) {
					return;
				}

				var solutions = ajax.responseXML.getElementsByTagName("solution");
				if (isCodeProblem()) {
					// place the first solution's text into the solution text box;
					// place the others into a drop-down select box
					var solutionText = getTextContent(solutions.item(0)).strip();

					// don't auto-indent HTML code (wrong indentation algorithm;
					// looks for brackets)
					if (!isHtmlProblem()) {
						if (typeof(indent) !== "undefined" && $("indent") && $("indent").linkIsEnabled()) {
							solutionText = indent(solutionText, TAB_STRING);
						}
					}
					setSolutionCode(solutionText);

					if (solutions.length > 1) {
						// multiple solutions; show them in a combo box
						if (!$("solutions") && $("cheatarea")) {
							var select = $(document.createElement("select"));
							select.id = "solutions";
							select.observe("change", solutionSelectChange);
							for (var i = 0; i < solutions.length; i++) {
								var option = $(document.createElement("option"));
								option.value = getTextContent(solutions.item(i)).strip();

								var name = solutions.item(i).getAttribute("name");
								option.update(name);
								select.appendChild(option);
							}

							while ($("cheatarea").firstChild) {
								$("cheatarea").removeChild($("cheatarea").firstChild);
							}
							$("cheatarea").appendChild(select);
						}
					}
				} else if (isMechanicalProblem()) {
					// mechanical problems' solutions should be inserted directly into
					// their respective input elements  (elements' IDs are equal to
					// the problem names)

					// example:
					// <solutions>
					//     <solution name="mechanical1">answer1</solution>
					//     <solution name="mechanical2">answer0</solution>
					// </solutions>
					var multiple = isMultipleChoiceProblem();

					for (var i = 0; i < solutions.length; i++) {
						var questionName = solutions.item(i).getAttribute("name").replace(/[\[\]].*/g, "");
						var answer = getTextContent(solutions.item(i));
						if (multiple) {
							if ($(questionName)) {
								var input = $$("#" + questionName + " input[value='" + answer + "']");
								if (input && input.length > 0) {
									input[0].checked = true;
								} else {
									// 'compact' multiple choice questions use select/option rather than inputs
									var option = $$("#" + questionName + " option[value='" + answer + "']");
									if (option && option.length > 0) {
										option[0].selected = true;
									}
								}
							}
						} else {
							if ($(questionName)) {
								$(questionName).value = answer;
								// $$(".expressiontable").each(Element.highlight);
							}
						}
					}
				}

				if ($("solvedstatus") && $("solvedstatus").hasClassName("unsolved")) {
					$("solvedstatus").src = "images/cheated.gif";
					$("solvedstatus").removeClassName("unsolved");
					$("solvedstatus").addClassName("cheated");
					$("solvedstatus").title = "You have solved this problem, but you peeked at the answer first.";
					$("solvedstatustext").update("You have solved this problem, but you peeked at the answer first.");
				}

				that.enableLink();
				if ($("solutionloading")) {
					$("solutionloading").style.visibility = "hidden";
				}
			},
			onFailure: ajaxFailure,
			onException: ajaxFailure
		});

		return abortEvent(event);
	}

	function showHintsClick(event) {
		if (!$("hintsarea")) { return; }
		event = EventExtend(event); // IE sucks
		event.abort();

		$("hintsarea").show();
		var processed = false;
		$$("#hintsarea .hint").each(function(element) {
			if (!processed && !element.visible()) {
				element.appear();
				processed = true;
			}
		});

		return event.abort();
	}

	function sliderChange(value) {
		var opacity = Math.max(0.0, Math.min(1.0, value / 100.0));
		$("htmlexpectedoutput").setOpacity(opacity);

		// dim the actual correct answer, sometimes
		if (opacity >= 0.8) {
			$("htmlactualoutput").setOpacity(1.0 - opacity);
		} else if (opacity >= 0.5) {
			$("htmlactualoutput").setOpacity(1.2 - opacity);
		} else {
			$("htmlactualoutput").setOpacity(1.0);
		}
	}

	function solutionAjaxCommon() {
		var enableButton = function() {
			$("solutionsubmit").enableLink();
		};
		// $("loadingarea").hide();
		$("loadingarea").hide();
		if ($("testresultsarea")) {
			if ($("testresultsarea").style.display == "none") {
			$("testresultsarea").appear({
				afterFinish: enableButton
			});
			} else {
				$("testresultsarea").appear({
					afterFinish: enableButton
				});
				// $("testresultsarea").pulsate({pulses: 2, duration: 1.0, afterFinish: enableButton});
			}
		}
		$("loading").fade();
		$("solutionsubmit").enableLink();
	}

	/**
	 * Called when the user has correctly solved another problem.
	 * Updates the page to contain new information about how many problems the user
	 * has solved, etc.
	 */
	function updateSolved() {
		// update user's total problems solved, if applicable
		if ($("usertotalsolved")) {
			if ($("newtotalsolved")) {
				$("usertotalsolved").update($("newtotalsolved").innerHTML);
			}
			if ($("solvedstatus") && $("solvedstatus").hasClassName("unsolved")) {
				$("solvedstatus").src = "images/solved.gif";
				$("solvedstatus").removeClassName("unsolved");
				$("solvedstatus").addClassName("solved");
				$("solvedstatus").title = "Already solved; good work!";
				// $("solvedcount").appear();
				if ($("solvedcountnumber")) {
					$("solvedcountnumber").update(parseInt($("solvedcountnumber").innerHTML) + 1);
				}
				if ($("solvedstatustext")) {
					$("solvedstatustext").update("You have solved this problem; good work!");
				}
			}
		}
	}

	function solutionAjaxSuccess(ajax) {
		var shouldDoEffect = !isMechanicalProblem() && !($("testresults"));
		if ($("testresultsarea")) {
			$("testresultsarea").update(ajax.responseText);
			if (shouldDoEffect) {
				$("testresultsarea").hide();
				$("testresultsarea").slideDown();
			} else {
				if ($("passcountmessagespan")) {
					// $("passcountmessagespan").scrollTo();
					$("passcountmessagespan").highlight({duration: 3.0});
				}
			}
		}

		if (!isTimedQuiz()) {
			if ($("passcountmessagespan") && $("passcountmessagespan").hasClassName("passedall")) {
				problemCorrect();
				updateSolved();
			} else if (!$("submittooquickly")) {
				problemIncorrect();
			}
		}

		// drawing panel problems
		$$(".drawingpanelarea img.output").each(function(image) {
			if (!image.hasMouseObserver) {
				image.observe("mousemove", drawingPanelImageMouseMove);
				image.hasMouseObserver = true;
			}
		});

		solutionAjaxCommon();
	}

	function solutionAjaxFailure(ajax, exception) {
		$("loading").hide();
		$("loadingarea").hide();
		ajaxFailure(ajax, exception);
		solutionAjaxCommon();
	}

	function solutionSelectChange(event) {
		setSolutionCode(indent(this.options[this.selectedIndex].value, TAB_STRING));
	}

	// eval() wrapper that makes sure that 'this' is the global window object
	// (important for injecting dynamically generated student code)
	function evalText(solutionText) {
		solutionText = solutionText.replace(
			/function[ \t\n]+([a-zA-Z0-9_$]+)[ \t\n]*/g,
			'window.$1 = function');
		solutionText = solutionText.replace(
			/var[ \t\n]+([a-zA-Z0-9_$]+)[ \t\n]*/g,
			'window.$1 ');
		eval(solutionText);
	}

	// submits the solution code to the server using Ajax,
	// then displays the result on the page.
	function solutionSubmitClick(event) {
		abortEvent(event);
		if (this.disabled) {
			return false;
		}

		if ($("sound") && $("sound").checked) {
			if (Sound) {
				try {
					Sound.play("sounds/click.wav");
				} catch (e) {
					console.log(e);
				}
			}
		}

		var mechanical = isMechanicalProblem();
		var solutionText = "";
		if (mechanical) {
			processMechanicalSolution();
		} else {
			if (isHtmlProblem()) {
				// put into HTML diff area
				processClientSideSolution();
			}

			// always submit to server
			processServerSideSolution();
		}
		// save solution text string to make sure value has not changed later
		if ($("solution")) {
			$("solution").initialValue = getSolutionCode();
		}
		return false;
	}

	function processMechanicalSolution() {
		// submit the solution form in the background
		$("solutionsubmit").disableLink();
		if ($("testresults")) {
			$("testresults").addClassName("outofdate");
		}
		$("loading").show();
		$("loadingarea").show();

		$("solutionform").request({
			onSuccess : solutionAjaxSuccess,
			onFailure : solutionAjaxFailure,
			onException : solutionAjaxFailure
		});
	}

	function processClientSideSolution() {
		// client-side problem (HTML/CSS, JavaScript)
		var solutionText = getSolutionCode();
		if (!solutionText.strip()) {
			// don't submit empty code
			return false;
		}

		if ($("solutionsubmit").hasClassName("JavaScript")) {
			// run their code as JavaScript
			// (this is tricky, because any stuff they declare/define in their
			// JS code become properties of the submit button unless I call
			// eval() from somewhere else whose 'this' reference is just the
			// global window object; that's why I have the evalText function)

			evalText(solutionText);
			alert("Solution submitted!  Now try it below.");

			// evalText(solutionText);

			// $("codeproblemscript").innerHTML = "<script type=\"text/javascript/\">" +
			//         solutionText + "</script>";
		} else if (isHtmlProblem() && $("actualhtmloutputinject")) {
			// $("htmlexpectedoutput").innerHTML = $("insertsolutionhere").innerHTML;
			$("actualhtmloutputinject").innerHTML = solutionText;
			$("expectedhtmloutput").style.height = "";
			$("actualhtmloutput").style.height = "";
			htmlDiffSliderChange();  // to equalize the div heights
			setTimeout(htmlDiffEqualizeSize, 1);   // must be done in a timeout so UI will update first
		}
	}

	function processServerSideSolution() {
		// client-side problem (HTML/CSS, JavaScript)
		var solutionText = getSolutionCode().strip();
		if (!solutionText) {
			// don't submit empty code
			return false;
		}
		setSolutionCode(getSolutionCode().rtrim());

		// server-side problem (more common); submit to server, so server can test it
		$("solutionsubmit").disableLink();

		if ($("testresults")) {
			$("testresults").addClassName("outofdate");
		}
		$("loading").show();

		// set loading area height to equal that of test results area, if present
		if ($("testresultsarea")) {
			var height = $("testresultsarea").getHeight();
			$("loadingarea").style.height = height + "px";
		}
		$("loadingarea").show();

		var params = getFormQueryParams($("solutionform"));
		if (codeMirror) {
			params["solution"] = getSolutionCode();
		}

		// if viewing page in debug mode, pass this on to the server so it'll produce extra output
		var pageQueryParams = Page.getQueryString();
		if (inDebugMode()) {
			params["debug"] = pageQueryParams["debug"];
		}
		if (pageQueryParams["captureoutput"]) {
			params["captureoutput"] = pageQueryParams["captureoutput"];
		}

		new Ajax.Request($("solutionform").action, {
			method : "post",
			parameters : params,
			onSuccess : solutionAjaxSuccess,
			onFailure : solutionAjaxFailure,
			onException : solutionAjaxFailure
		});
	}

	function solutionKeyDown(event) {
		// for some reason, IE barfs on keypress events and is much better w/ keydown
		if (isIE() || isSafari()) {
			return solutionKeyPress(event);
		}
	}

	function solutionKeyPress(event) {
		event = EventExtend(event); // IE sucks
		var result = true;
		if (event.keyCode == event.KEY_RETURN) { // new line, \n
			result = insertCharacter($("solution"), LINE_SEPARATOR, false);

			// possibly grow text area to accommodate newly entered lines
			var lineCount = getTextContent($("solution")).split(LINE_SEPARATOR).length;
			// alert(lineCount);
			if (lineCount > $("solution").rows - (isIE() ? 4 : 0)) {
				resizeSolution(lineCount + (isIE() ? 4 : 0));
			}

		} else if (event.keyCode == event.KEY_TAB) { // tab, \t
			if (!event.ctrlKey && !event.altKey && !event.metaKey) {
				result = insertCharacter($("solution"), TAB_STRING, event.shiftKey);
			}
		} else if (typeof(event.charCode) !== "undefined" && event.charCode == "}".charCodeAt(0)) {
			// special case to unindent for closing braces
			result = insertCharacter($("solution"), "}", event.shiftKey);
		} else if (event.altKey & typeof(event.charCode) !== "undefined") {
			if (event.charCode == "S".charCodeAt(0)) {
				// Submit solution when user presses Alt+S
				solutionSubmitClick();
			} else if (event.charCode == "I".charCodeAt(0)) {
				// Indent solution when user presses Alt+I
				indentClick();
			} else if (event.charCode == "C".charCodeAt(0)) {
				// Clear solution when user presses Alt+C
				clearClick();
			}
		}

		if (!result) { // cancel the event
			event.abort();
		}
		return result;
	}

	function stopTimedQuiz() {
		Cookies.remove(TIMED_QUIZ_START_COOKIE_NAME);
		clearInterval(timedQuizTimerID);
	}

	function stripComments(text) {
		// multi-line comments : /* */
		text = text.replace(/\/\*([^*]|\*[^\/]|[\r\n])*\*\//gi, "");

		// single-line comments: //
		text = text.replace(/^([ \t]*\/\/.*\r?\n)+/gi, ""); // at start of text
		text = text.replace(/(\r?\n[ \t]*\/\/.*)+\r?\n/gi, LINE_SEPARATOR); // that occupy entire lines
		text = text.replace(/[ \t]*\/\/.*/g, ""); // at ends of lines
		return text;
	}

	function stripCommentsClick(event) {
		if (this.disabled) {
			return abortEvent(event);
		}
		setSolutionCode(stripComments(getSolutionCode()));
		return abortEvent(event);
	}

	function tallerClick(event) {
		if (this.disabled) {
			return abortEvent(event);
		}
		resizeSolution($("solution").rows + 3);
		return abortEvent(event);
	}

	function turninQuizClick(event) {
		if (confirm("Are you sure you want to turnin your quiz?  Once you turn in " +
				"your quiz, the quiz will be over and you will see your results.  " +
				"You will not be able to return to the quiz after it is turned in.")) {
			stopTimedQuiz();
		} else {
			return abortEvent(event);
		}
	}

	/** Updates the string for converting tabs to spaces. */
	function updateTabString() {
		if ($("indentspacecount") && (!$("indenttabs") || !$("indenttabs").checked)) {
			var spaces = Math.max(0, parseInt($("indentspacecount").value));
			if (spaces > 0 && spaces < 80) {
				TAB_STRING = buildTabString(spaces);
			}
		}
	}

	function windowBeforeUnload(event) {
		event = EventExtend(event); // IE sucks
		if ($("solution") && $("solution").initialValue != getSolutionCode()) {
			var confirmMsg = "You have not submitted your latest code.  You may want to submit/save it before moving on.";

			// https://developer.mozilla.org/en/DOM/window.onbeforeunload says I should do this
			if (event) {
				event.returnValue = confirmMsg;
			}
			return confirmMsg;
		}
	}
})();
