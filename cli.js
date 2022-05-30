#!/usr/bin/env node

const { consoleTerminal, everdevInit, everdevDone, cli } = require("./dist")

;(async () => {
    try {
        everdevInit()
        await cli.run(consoleTerminal)
        everdevDone()
    } catch (err) {
        if (!(err instanceof Error)) {
            const { data, code } = err
            err = new Error(err.message)
            err.code = code
            err.data = data
        }
        console.error(`${err}`)
        process.exit(1)
    }
})()
