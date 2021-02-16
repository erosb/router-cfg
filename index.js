"use strict";
let programLines, symbolTable;
let lineNo;
let output;

function substVars(line) {
    var matches = line.matchAll(/<([a-zA-Z0-9_]+)>/g)
    if (matches !== null) {
        for (let match of matches) {
            let toBeReplaced = match[0];
            let varName = match[1];
            let resolvedSymbol = symbolTable[varName];
            if (resolvedSymbol === undefined) {
                throw `undefined variable ${varName} found at line ${lineNo}`
            } else if (resolvedSymbol.type === "scalar") {
                line = line.replaceAll(toBeReplaced, symbolTable[varName].value);
            } else if (resolvedSymbol.type === "list") {
                throw "cannot print list " + varName
            } else if (resolvedSymbol.type === "dictionary") {
                throw "cannot print dictionary " + varName
            }
        }
    }
    return line;
}

function currentLine() {
    return programLines[lineNo].trim();
}

function currentLineIsEndIf() {
    return currentLine().match(/^#\s*endif\s*$/i) !== null
}

function currentLineIsEndFor() {
    return currentLine().match(/^#\s*endfor\s*$/i) !== null
}

function currentLineIsUnless() {
    return currentLine().match(/^#\s*unless\s*$/i) !== null
}

function processIf(line) {
    let match = line.trim().match(/^#\s*if\s*([a-zA-Z0-9_]+)\s*$/i)
    if (match === null) {
        console.warn("cannot process line ${line}")
        return;
    }
    let varName = match[1]
    if (symbolTable[varName].value) {
        ++lineNo;
        while (!(currentLineIsEndIf() || currentLineIsUnless())) {
            processCurrentLine()
            ++lineNo;
        };
        if (currentLineIsUnless()) {
            do {
                ++lineNo;
            } while(!currentLineIsEndIf())
        }
    } else {
        do {
            ++lineNo;
        } while(!(currentLineIsEndIf() || currentLineIsUnless()))
        if (currentLineIsUnless()) {
            ++lineNo;
            while (!currentLineIsEndIf()) {
                processCurrentLine()
                ++lineNo;
            };
        }
    }
}

function processForEach(line) {
    let match = line.match(/^#\s*foreach\s+([a-zA-Z0-9_,]+)\s+in\s+([a-zA-Z0-9_]+)/i)
    if (match === null) {
        console.warn("cannot process line ${line}")
        return;
    }
    console.log(match)
    let loopVars = match[1];
    let iterableName = match[2];
    let iterableSymbol = symbolTable[iterableName];
    if (iterableSymbol === undefined) {
        throw `cannot iterate on nonexistent variable ${iterableName} on line ${lineNo}`
    }
    switch (iterableSymbol.type) {
        case "scalar":
            throw `cannot iterate on scalar variable ${iterableName} on line ${lineNo}`
        case "list":
            let listItems = iterableSymbol.value;
            let loopBodyStart = ++lineNo;
            for (let itemIndex in listItems) {
                lineNo = loopBodyStart
                let item = listItems[itemIndex]
                symbolTable[loopVars] = {
                    value: item,
                    type: "scalar"
                }
                do {
                    processCurrentLine();
                    ++lineNo;
                } while(!currentLineIsEndFor());
            }
            delete symbolTable[loopVars]
            break;
        default:
            throw "unhandled symbol type"
    }
}

function processCurrentLine() {
    let line = programLines[lineNo].trim();
    if (line.trim() === "!") {
        return;
    }
    if (line.startsWith("#")) {
        let command = line.substring(1).trim();
        if (command.toLowerCase().startsWith("if")) {
            processIf(line)
        } else if (command.toLowerCase().startsWith("foreach")) {
            processForEach(line)
        }
    } else {
        output.push(substVars(programLines[lineNo]))
    }
}

function parseVariables(rawVars) {
    let retval = {};
    rawVars = rawVars.trim();
    for (let line of rawVars.split("\n")) {
        if (line.trim() === "") {
            continue;
        }
        let eqIdx = line.indexOf("=");
        if (eqIdx == -1) {
            throw "invalid variable definition: " + line
        }
        let varName = line.substring(0, eqIdx).trim();
        let rawValue = line.substring(eqIdx + 1).trim();
        if (retval[varName]) {
            throw `duplicate variable definition: ${varName}`
        }
        let parsedSymbol = {};
        if (rawValue.indexOf(",") === -1) {
            if (rawValue === "false") {
                rawValue = false;
            }
            parsedSymbol = {
                type: "scalar",
                value: rawValue
            } 
        } else {
            let items = rawValue.split(",");
            let listItems = [];
            let kvPairs = {};
            let kvPairMode = null;
            for (let item of items) {
                let colonIdx = item.indexOf(":");
                if (colonIdx === -1) {
                    if (kvPairMode === true) {
                        throw `ambiguous variable ${varName}: cannot determine if it is a list or dictionary`
                    }
                    listItems.push(item);
                    kvPairMode = false
                } else {
                    if (kvPairMode === false) {
                        throw `ambiguous variable ${varName}: cannot determine if it is a list or dictionary`
                    }
                    let key = item.substring(0, colonIdx).trim();
                    let val = item.substring(colonIdx + 1).trim();
                    kvPairs[key] = val;
                    kvPairMode = true;
                }
            }
            if (kvPairMode === true) {
                parsedSymbol = {
                    type: "dictionary",
                    value: kvPairs
                }
            } else if (kvPairMode === false) {
                parsedSymbol = {
                    type: "list",
                    value: listItems
                }
            }
        }
        retval[varName] = parsedSymbol
    }
    return retval
}

function preprocessLines(prog) {
    let lines = prog.trim().split("\n");
    let retval = [];
    for (let i = 0; i < lines.length; ++i){
        let line = lines[i].trim();
        let prevLine = retval[retval.length - 1];
        if (prevLine !== undefined && prevLine.endsWith("\\")) {
            retval[retval.length - 1] = prevLine.substring(0, prevLine.length -1) + line
        } else {
            retval.push(line)
        }
    }
    return retval;
}

function main(prog, vars) {
    programLines = preprocessLines(prog)
    symbolTable = parseVariables(vars);
    lineNo = 0;
    output = [];
    while (lineNo < programLines.length) {
        processCurrentLine();
        ++lineNo;
    }
    return output.join("\r\n")
}

if (document.getElementsByName("txt-output").length > 0) {
    document.addEventListener("DOMContentLoaded", (e) => {

        function runMain(e) {
            if (e.keyCode == 10 && e.ctrlKey) {
                var output = main(
                    document.getElementsByName("txt-src")[0].value,
                    document.getElementsByName("txt-variables")[0].value
                );
                document.getElementsByName("txt-output")[0].value = output;
            }
        }

        document.getElementsByName("txt-src")[0].addEventListener("keypress", runMain);
        document.getElementsByName("txt-variables")[0].addEventListener("keypress", runMain);

    });
}