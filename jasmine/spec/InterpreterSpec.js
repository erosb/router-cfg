describe("router cfg", () => {

    beforeEach(() => {
        jasmine.addMatchers({
            toOutput: () => {
                return {
                    compare: (actual, expected) => {
                        let actualLines = actual.trim().split("\n");
                        let expectedLines = expected.trim().split("\n");
                        if (expectedLines.length !== actualLines.length) {
                            return {
                                pass: false,
                                message: `expected ${expectedLines.length} lines, got ${actualLines.length}`
                            }
                        }
                        for (let lineNo in expectedLines) {
                            let expLine = expectedLines[lineNo].trim();
                            let actLine = actualLines[lineNo].trim();
                            if (expLine.trim() !== actLine.trim()) {
                                return {
                                    pass: false,
                                    message: `line ${lineNo}: expected ${expLine}, but was: ${actLine}`
                                };
                            }
                        }
                        return {
                            pass: true
                        }
                    }
                }
            }
        })
    })

    function expectError(input, vars, expectedError) {
        try {
            main(input, vars);
            fail("did not throw error")
        } catch (e) {
            expect(e.toString()).toEqual(expectedError);
        }
    }

    describe("basic echo", () => {
        it("writes no-operation line", () => {
            let actual = main(`
                print this
                and this`, ``)
            expect(actual).toOutput(`print this
            and this`)
        })
    })

    describe("variable substitution and symbol table parsing", () => {
        it("substitutes variables", () => {
            let actual = main(`first <FIRST_VAR> <SECOND_VAR>
            second <SECOND_VAR>`,
                `FIRST_VAR = 1
            SECOND_VAR = two`)
            expect(actual).toOutput(`first 1 two
            second two`);
        })

        it("prints error on undefined variable", () => {
            expectError(`first <var>`, ``, "undefined variable var found at line 0")
        });

        it("prints error on substituting list-type variable", () => {
            expectError(`<listvar>`, `listvar = a,b,c`, "cannot print list listvar")
        })

        it("prints error on substituting dict-type variable", () => {
            expectError(`<dictvar>`, `dictvar = a:1,b:2,c:3`, "cannot print dictionary dictvar")
        })

        it("prints error on duplicate variable", () => {
            expectError(``, `first=1
            second=a,b,c
            first=3`, "duplicate variable definition: first")
        });

        it("prints error on ambiguous var type", () => {
            expectError(``, `ambigvar=a:1,b`, "ambiguous variable ambigvar: cannot determine if it is a list or dictionary")
            expectError(``, `ambigvar=a,b:1`, "ambiguous variable ambigvar: cannot determine if it is a list or dictionary")
        })
    })

    describe("conditionals", () => {

        describe("endif", () => {

            it("works without spaces", () => {
                programLines = ["#endif"];
                lineNo = 0;
                expect(currentLineIsEndIf()).toBe(true)
            })

            it("works with spaces", () => {
                programLines = ["#  endif"];
                lineNo = 0;
                expect(currentLineIsEndIf()).toBe(true)
            })
            
        })

        it("if evaluates to true", () => {
            let actual = main(`
            before
            #if tru
            line 1
            # endif
            after`, `tru=true`)
            expect(actual).toOutput(
                `before
                line 1
                after`)
        })

        it("if evaluates to true, has unless", () => {
            let actual = main(`
            before
            #if tru
            line 1
            #unless
            unless-line
            # endif
            after`, `tru=true`)
            console.log(actual)
            expect(actual).toOutput(
                `before
                line 1
                after`)
        })

        it("if evaluates to false", () => {
            let actual = main(`
            before
            #if fls
            line 1
            # endif
            after`, `fls=false`)
            expect(actual).toOutput(
                `before
                after`)
        })

        it("if evaluates to false, has unless", () => {
            let actual = main(`
            before
            #if fls
            line 1
            #unless
            unless-line
            # endif
            after`, `fls=false`)
            console.log(actual)
            expect(actual).toOutput(
                `before
                unless-line
                after`)
        })

        it("misses closing endif", () => {

        })

    })

})