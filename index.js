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

function currentLineIsUnless() {
    return currentLine().match(/^#\s*unless\s*$/i) !== null
}

function processIf(line) {
    let match = line.trim().match(/^#\s*if\s*([a-zA-Z0-9_]+)\s*$/i)
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

function processCurrentLine() {
    let line = programLines[lineNo].trim();
    if (line.startsWith("#")) {
        let command = line.substring(1);
        while (command[0] === " ") {
            command = command.substring(1);
        }
        if (command.toLowerCase().startsWith("if")) {
            processIf(line)
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

function main(prog, vars) {
    programLines = prog.trim().split("\n");
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