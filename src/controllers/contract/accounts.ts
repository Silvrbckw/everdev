import { Terminal } from "../../core"
import { Account, AccountOptions, AccountType } from "@eversdk/appkit"
import { NetworkRegistry } from "../network/registry"
import { TonClient } from "@eversdk/core"
import { SignerRegistry } from "../signer/registry"
import { ParamParser } from "./param-parser"
import { resolveContract } from "../../core/solFileResolvers"

// Remove suffix graphql if exists and add projectId
// Intentionally do not use URL object or any modules,
// because url may lack `http://` prefix
export const transformEndpoint = (project?: string) => (url: string) => {
    const result = url
        .trim()
        .replace(/\/graphql\/?$/i, "")
        .replace(/\/$/, "")
    return project ? `${result}/${project}` : result
}

export async function getAccount(
    terminal: Terminal,
    args: {
        file: string
        network: string
        signer: string
        data: string
        address?: string
    },
): Promise<Account> {
    const address = args.address ?? ""
    const network = new NetworkRegistry().get(args.network)
    const { project, accessKey } = network.credentials || {}
    const client = new TonClient({
        network: {
            endpoints: network.endpoints.map(transformEndpoint(project)),

            ...(accessKey ? { access_key: accessKey } : {}),
        },
    })
    const contract =
        args.file !== ""
            ? resolveContract(args.file)
            : { package: { abi: {} }, abiPath: "" }
    const signers = new SignerRegistry()
    const signerItem = await signers.resolveItem(args.signer, {
        useNoneForEmptyName: address !== "",
    })
    const options: AccountOptions = {
        signer: await signers.createSigner(signerItem),
        client,
    }
    const abiData = contract.package.abi.data ?? []
    if (abiData.length > 0 && args.data !== "") {
        options.initData = ParamParser.components(
            {
                name: "data",
                type: "tuple",
                components: abiData,
            },
            args.data,
        )
    }
    if (address !== "") {
        options.address = address
    }
    const account = new Account(contract.package, options)
    terminal.log("\nConfiguration\n")
    terminal.log(
        `  Network: ${network.name} (${NetworkRegistry.getEndpointsSummary(
            network,
        )})`,
    )
    terminal.log(
        `  Signer:  ${
            signerItem
                ? `${signerItem.name} (public ${signerItem.keys.public})`
                : "None"
        }\n`,
    )
    if (address === "" && abiData.length > 0 && !options.initData) {
        terminal.log(
            `Address:   Can't calculate address: additional deploying data required.`,
        )
    } else {
        terminal.log(
            `Address:   ${await account.getAddress()}${
                address === "" ? " (calculated from TVC and signer public)" : ""
            }`,
        )
    }
    return account
}

export type ParsedAccount = {
    acc_type: AccountType
    code_hash?: string
    [name: string]: unknown
}

export async function getParsedAccount(
    account: Account,
): Promise<ParsedAccount> {
    try {
        return await account.getAccount()
    } catch (err) {
        const acc = await account.client.net.query_collection({
            collection: "accounts",
            filter: { id: { eq: await account.getAddress() } },
            result: "acc_type",
            limit: 1,
        })
        if (acc.result.length === 0) {
            return {
                acc_type: AccountType.nonExist,
            }
        }
        throw err
    }
}
