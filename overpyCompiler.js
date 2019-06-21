"use strict";
//OverPy Compiler (OverPy -> Workshop)


//console.log(compileTest);

var t0 = performance.now();
console.log(compile(compileTest));
var t1 = performance.now();
console.log("Time: "+(t1-t0)+"ms");

function compile(content) {
	
	var rules = splitRules(content);
	console.log(rules);
	
	var result = "";
	for (var i = 0; i < rules.length; i++) {
	//for (var i = 21; i < 23; i++) {
		result += compileRule(rules[i]);
	}
	console.log(rules);
	return result;
}

/*
Really a class, but I couldn't manage to make the "class" keyword work.
*/
function Macro(text, replacement, args) {
	
	if (args === undefined || args.length === 0) {
		this.isFunction = false;
	} else {
		this.isFunction = true;
		this.args = args;
	}
	this.text = text;
	this.replacement = replacement;
}

function compileRule(rule) {
	
	currentLineNb = rule.lineStart;
	var result = "";
	
	//The first line should always start with @Rule.
	if (!rule.lines[0].startsWith("@Rule ")) {
		error("Lexer broke");
	}
	
	result += tows("@Rule", ruleKw)+" ("+rule.lines[0].substring("@Rule ".length)+") {\n";
	result += tabLevel(1)+tows("@Event", ruleKw)+" {\n";
	
	var isInEvent = true;
	var isInActions = false;
	var isEventTeamDefined = false;
	var isEventPlayerDefined = false;
	
	for (var i = 1; i < rule.lines.length; i++) {
				
		currentLineNb++;
		currentColNb = 1;
		
		if (rule.lines[i].trim() === "") {
			continue;
		}
		
		
		if (rule.lines[i].startsWith("@")) {
			if (!isInEvent) {
				error("Annotation found after code");
			} else {
				if (rule.lines[i].startsWith("@Event ")) {
					result += tabLevel(2)+tows(rule.lines[i].substring("@Event ".length), eventKw)+";\n";
					
				} else if (rule.lines[i].startsWith("@Team ")) {
					if (isEventTeamDefined) {
						error("Event team defined twice");
					}
					
					isEventTeamDefined = true;
					result += tabLevel(2)+tows(rule.lines[i].substring("@Team ".length), eventKw);
					
				} else if (rule.lines[i].startsWith("@Hero ")) {
					if (isEventPlayerDefined) {
						error("Event player defined twice");
					}
					if (!isEventTeamDefined) {
						result += tabLevel(2)+tows("all", eventKw)+";\n"+tabLevel(2);
						isEventTeamDefined = true;
					}
					isEventPlayerDefined = true;
					result += tabLevel(2)+tows(rule.lines[i].substring("@Hero ".length), eventKw);
					
				} else if (rule.lines[i].startsWith("@Slot ")) {
					if (isEventPlayerDefined) {
						error("Event player defined twice");
					}
					if (!isEventTeamDefined) {
						result += tabLevel(2)+tows("all", eventKw)+";\n"+tabLevel(2);
						isEventTeamDefined = true;
					}
					
					isEventPlayerDefined = true;
					result += tabLevel(2)+tows(rule.lines[i].substring("@Slot ".length), eventKw);
					
				} else {
					error("Unknown annotation");
				}
			}
		} else {
			if (isInEvent) {
				if (!isEventTeamDefined) {
					result += tabLevel(2)+tows("all", eventKw)+";\n";
				}
				if (!isEventPlayerDefined) {
					result += tabLevel(2)+tows("all", eventKw)+";\n";
				}
				isInEvent = false;
				result += tabLevel(1)+"}\n\n";
			}
			
			//If without indentation = (rule) condition
			if (rule.lines[i].startsWith("if ")) {
				result += tabLevel(1)+tows("_conditions", ruleKw)+" {\n";
				result += parseRuleCondition(rule.lines[i]);
				result += tabLevel(1)+"}\n\n";
			} else {
				if (!isInActions) {
					result += tabLevel(1)+tows("_actions", ruleKw)+" {\n";
					isInActions = true;
				}
				
				result += tabLevel(2)+parse(rule.lines[i]);
				result += ";\n";
			}
			
		}
		
		
	}
	
	if (isInActions) {
		//End actions
		result += tabLevel(1)+"}\n";
	}
	
	//End rules
	result += "}\n\n";
	
	return result;
}

/*
The main parse function.
*/
function parse(content) {
	
	if (content === undefined) {
		error("Content is undefined");
	}
	
	//Parse operators
	
	
	
}

function parseRuleCondition(content) {
	
	debug("Parsing rule condition(s) '"+content+"'");
	
	var [endLineNb, endColNb, content] = content.trimAdjustNb();
	var result="";
	
	if (!content.endsWith(":")) {
		error("If statement doesn't end with ':'");
	}
	
	content = content.substring("if ".length, content.length-1);
	var tempArr = content.trimAdjustNb();
	endLineNb += tempArr[0];
	endColNb += tempArr[1]+':'.length;
	content = tempArr[2];
	
	//If there is any "or" in the condition, there is only one instruction.
	var orOperands = splitStrOnDelimiter(content, " or ");
	
	if (orOperands.length > 1) {
		debug("Condition contains 'or'");
		result += tabLevel(2)+parse(content);
	} else {
		var andOperands = splitStrOnDelimiter(content, " and ");
		
		for (var i = 0; i < andOperands.length; i++) {
			
			debug("Parsing condition '"+andOperands[i]+"'");
			
			result += tabLevel(2);
			
			var comparisonOperators = ["==", "!=", "<=", ">=", "<", ">"];
			var comparisonOperands;
			var hasComparisonOperand = false;
			
			for (var j = 0; j < comparisonOperators.length; j++) {
				comparisonOperands = splitStrOnDelimiter(andOperands[i], comparisonOperators[j]);
				if (comparisonOperands.length > 1) {
					if (comparisonOperands.length != 2) {
						error("Chained comparisons are not allowed (eg: a == b == c)");
					}
					result += parse(comparisonOperands[0]);
					currentColNb += comparisonOperators[j].length;
					result += " "+comparisonOperators[j]+" "+parse(comparisonOperands[1]);
					hasComparisonOperand = true;
					break;
				}
			}
			
			if (!hasComparisonOperand) {
				if (andOperands[i].startsWith("not ")) {
					currentColNb += "not ".length;
					result += parse(content.substring("not ".length)) + " == "+tows("false", boolKw);
				} else {
					result += parse(content) + " == "+tows("true", boolKw);
				}
			}
			
			result += ";\n";
		}
	}
	
	currentLineNb += endLineNb;
	currentColNb += endColNb;
	
	return result;
}

/*
Splits the content to return an array of rules, with an array of (effective) lines.
We cannot do split('\n') because we need to handle backslashed lines, and multi-line functions.
For example, the following will count as 1 line:

function(arg1, arg2,
	arg3, arg4)
	
As well as the following:

#!define owo(x) function(x)\
function(y)

While we're at it, this function also automatically removes comments,
and splits rules as well as macros.
It also resolves macros.
*/

function splitRules(content) {
	
	var rules = [];
	var macros = [];
	
	var isInSpecial = false;
	//var isInString = false;
	var currentStrDelimiter = "";
	var isInLineComment = false;
	var isInStrComment = false;
	var isInMacro = false;
	var currentStrCommentDelimiter = "";
	var bracketsLevel = 0;
	var isInRule = false;
	var currentRule = {};
	var currentRuleLine = [];
	//var currentToken = {"text":""};
	var currentMacro = {};
	var isBackslashed = false;
	var isInTextToken = false;
	
	//"Timer" used for end of special zones (eg: the end of a multiline string is 3 characters long).
	var timer = 0;
	
	//Timer used when inside a macro resolution, in order to stop incrementing column+line.
	var macroTimer = 0;
	var macroCols = 0;
	var macroLines = 0;
	
	currentLineNb = 1;
	currentColNb = 1;
	
	function addToken(text) {
		
		//currentToken.lineNb = currentLineNb;
		//currentToken.colNb = currentColNb;
		currentRuleLine.push({
			"lineNb":currentLineNb,
			"colNb":currentColNb,
			"text":text
		});
		//currentToken = {"text":""};
	}
	
	for (var i = 0; i < content.length; i++) {
		
		isInSpecial = (isInLineComment || isInStrComment || isInMacro);
		
		
		if (macroTimer === 0) {
			currentColNb++;
		}
		
		if (macroTimer > 0) {
			macroTimer--;
			if (macroTimer === 0) {
				currentLineNb += macroLines;
				currentColNb = macroCols;
			}
		}
		
		if (timer > 0) {
			timer--;
			if (timer === 0) {
				isInStrComment = false;
			}
		}
		
		if (content[i] === '\n') {
			if (!isBackslashed) {
				if (isInMacro) {
					isInMacro = false;
					macros.push(parseMacro(currentMacro));
				}
			}
			//For some reason, in Python, line comments aren't affected by backslashes before new lines.
			if (isInLineComment) {
				isInLineComment = false;
				
			
			//Do not end the instruction if there is a line break inside a function, or the line is backslashed.
			} else if (bracketsLevel === 0 && isInRule && !isBackslashed) {
				currentRule.lines.push(currentRuleLine);
				currentRuleLine = [];
				
			}
			if (macroTimer === 0) {
				currentLineNb++;
				currentColNb = 1;
			}
			
		} else if (!isInStrComment && !isInMacro && !isInLineComment) {
			
			if (content[i] === '(' || content[i] === '[' || content[i] === '{') {
				bracketsLevel++;
				addToken(content[i]);
				
			} else if (content[i] === ')' || content[i] === ']' || content[i] === '}') {
				bracketsLevel--;
				if (bracketsLevel < 0) {
					error("Brackets level below 0");
				}
				addToken(content[i]);
				
			} else if (content.startsWith("#!", i)) {
				if (!isInRule) {
					isInMacro = true;
					currentMacro = {
						"lineStart":currentLineNb,
						"content":""
					};
				} else {
					error("Cannot declare macro inside a rule");
				}
				
			} else if (content[i] === '#') {
				isInLineComment = true;
			
			} else if (content.startsWith("'''", i)) {
				isInStrComment = true;
				currentStrCommentDelimiter = "'''";
				
			} else if (content.startsWith('"""', i)) {
				isInStrComment = true;
				currentStrCommentDelimiter = '"""';
				
			} else if (content[i] === '"' || content[i] === '\'') {
				currentStrDelimiter = content[i];
				//Get to the end of the string
				var j = i;
				for (; j < content.length && !(!isBackslashed && content[i] === currentStrDelimiter); j++) {
					
					//Test for potentially unclosed string
					if (!isBackslashed && content[j] === '\n') {
						error("Unclosed string");
					}
				
						
					if (content[j] === '\\') {
						isBackslashed = true;
					} else {
						isBackslashed = false;
					}
				}
				addToken(content.substring(i, j));
				i += j-1;
								
			} else {
				//Test each macro
				for (var j = 0; j < macros.length; j++) {
					if (content.startsWith(macros[j].name, i)) {
						
						
						var text;
						var replacement;
						
						if (macros[j].isFunction) {
							//debug("Resolving function macro "+macros[j].name);
							var bracketPos = getBracketPositions(content.substring(i), true);
							text = content.substring(i, i+bracketPos[1]+1);
							var macroArgs = getArgs(content.substring(i+bracketPos[0]+1, i+bracketPos[1]));
							replacement = resolveMacro(macros[j], macroArgs);
							
						} else {
							//debug("Resolving normal macro "+macros[j].name);
							text = macros[j].name;
							replacement = macros[j].replacement;
						}
						
						content = content.substring(0, i) + replacement + content.substring(i+text.length);
						if (macroTimer === 0) {
							if (text.indexOf('\n') >= 0) {
								macroCols = text.length - text.lastIndexOf('\n');
								macroLines = text.split('\n').length-1;
							} else {
								macroCols = text.length;
							}
						}
						macroTimer += text.length;
						
						//debug("Text: "+text);
						//debug("Replacement: "+replacement);
						
						j = 0;
					}
				}
				
				//Get token
				var j = i;
				for (; j < content.length && content[j].isVarChar; j++);
				
				if (j > i) {
					if (content.substring(i, j) === "@Rule") {
						isInRule = true;
						rules.push(currentRule);
						currentRule = {
							"lineStart":currentLineNb,
							"lines":[]
						};
						currentRuleLine = [];
					} else if (!isInRule) {
						error("Found code outside a rule : "+content[i]);
					}
					
					
					addToken(content.substring(i, j))
					i += j-1;
				}
				
				
				
			}
			
		} else if (isInStrComment && content.startsWith(currentStrCommentDelimiter, i)) {
			timer = 3;
			
		}
		
		
		if (content[i] === '\\') {
			isBackslashed = true;
		} else {
			isBackslashed = false;
		}
		
		if (isInMacro) {
			currentMacro.content += content[i];
		}
	}
	
	rules.push(currentRule);
	
	console.log(macros);
	
	return rules.slice(1)
	
}

function resolveMacro(macro, args=[]) {
	if (macro.isFunction) {
		
		//debug("Args: "+args);
		if (args.length != macro.args.length) {
			error("Wrong number of arguments for macro "+macro.name);
		}
		
		var result = macro.replacement;
		//debug("result 1 = "+result);
		
		//No lookbehinds; no other way than to manually loop...
		for (var i = 0; i < result.length; i++) {
			for (var j = 0; j < macro.args.length; j++) {
				if (result.startsWith(macro.args[j], i)) {
					if ((i > 0 && !isVarChar(result[i-1])) && (i < result.length-1 && !isVarChar(result[i+macro.args[j].length]))) {
						result = result.substring(0, i)+args[j]+result.substring(i+macro.args[j].length);
					}
				}
			}
		}
		for (var i = 0; i < macro.args; i++) {
			result = result.replace(new RegExp("^(?!\\w).+"+macro.args[i]+"(?!\\w)", 'g'), args[i]);
		}
		//debug("result 2 = "+result);
		result = result.replace(new RegExp("\\\\\\n", 'g'), '\n');
		//debug("result 3 = "+result);
		return result;
	} else {
		return macro.replacement;
	}
}

function parseMacro(macro) {
	
	macro.content = macro.content.substring("#!define ".length);
	var bracketPos = getBracketPositions(macro.content);
	
	if (bracketPos.length === 0 || macro.content.indexOf(" ") < bracketPos[0]) {
		//Not a function macro
		macro.isFunction = false;
		macro.text = macro.content.substring(0, macro.content.indexOf(" ")).trim();
		macro.name = macro.text;
		macro.replacement = macro.content.substring(macro.content.indexOf(" ")).trim();
		
	} else {
		//Function macro
		macro.isFunction = true;
		macro.text = macro.content.substring(0, bracketPos[1]+1).trim();
		macro.name = macro.content.substring(0, bracketPos[0]).trim();
		macro.replacement = macro.content.substring(bracketPos[1]+1).trim();
		macro.args = getArgs(macro.content.substring(bracketPos[0]+1, bracketPos[1]));
	}
	
	return macro;
	
}