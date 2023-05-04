import { doneTests, initTests } from "./init"
import { runCommand, consoleTerminal } from ".."
import { NetworkRegistry } from "../controllers/network/registry"
import { SignerRegistry } from "../controllers/signer/registry"

import * as knownContracts from "../core/known-contracts"

beforeAll(async () => {
    await initTests()
    await new SignerRegistry().addSecretKey(
        "alice",
        "",
        "172af540e43a524763dd53b26a066d472a97c4de37d5498170564510608250c3",
        true,
    )
})
afterAll(doneTests)

test("Add network giver by address", async () => {
    const mock = jest.spyOn(knownContracts, "knownContractFromAddress")
    mock.mockReturnValue(
        Promise.resolve(knownContracts.KnownContracts["GiverV2"]),
    )
    await runCommand(consoleTerminal, "network giver", {
        name: "se",
        address:
            "0:b5e9240fc2d2f1ff8cbb1d1dee7fb7cae155e5f6320e585fcc685698994a19a5",
        type: "GiverV2",
        signer: "alice",
    })
    expect(new NetworkRegistry().get("se").giver?.name).toEqual("GiverV2")
})

test("Add network giver by type", async () => {
    await runCommand(consoleTerminal, "network giver", {
        name: "se",
        type: "GiverV2",
        signer: "alice",
    })
    expect(new NetworkRegistry().get("se").giver?.name).toEqual("GiverV2")

    await runCommand(consoleTerminal, "network giver", {
        name: "se",
        type: "SafeMultisigWallet",
        signer: "alice",
    })
    expect(new NetworkRegistry().get("se").giver?.name).toEqual(
        "SafeMultisigWallet",
    )
    await runCommand(consoleTerminal, "network giver", {
        name: "se",
        type: "MsigV2",
        signer: "alice",
    })
    expect(new NetworkRegistry().get("se").giver?.name).toEqual("MsigV2")
})

test("Add network giver error", async () => {
    try {
        await runCommand(consoleTerminal, "network giver", {
            name: "se",
            type: "NotExist",
            signer: "alice",
        })
        expect(true).toBe(false)
    } catch (error: any) {
        expect(error.message).toBe(
            "Can not resolve giver address: unknown giver type NotExist.",
        )
    }
})

test("Add credentials", async () => {
    await runCommand(consoleTerminal, "network credentials", {
        name: "se",
        project: "pro123",
        accessKey: "key456",
    })
    const registry = new NetworkRegistry().get("se")
    expect(registry.credentials?.project).toEqual("pro123")
    expect(registry.credentials?.accessKey).toEqual("key456")
})

test("Clear credentials", async () => {
    await runCommand(consoleTerminal, "network credentials", {
        name: "se",
        clear: true,
    })
    const registry = new NetworkRegistry().get("se")
    expect(registry.credentials?.project).toBeUndefined()
})
