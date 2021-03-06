#!/usr/bin/env node
import {main} from './index'
import {awsCodeArtifactConfig} from 'types'
import manpage from './manpage'

enum CmdTypeArgs {
  domain = 'domain',
  repository = 'repository',
  scope = 'scope',
  region = 'region',
  accountId = 'accountId',
  help = 'help',
}

const cmdArgs = {
  [CmdTypeArgs.domain]: ['-d', '--domain'],
  [CmdTypeArgs.repository]: ['-r', '--repository'],
  [CmdTypeArgs.scope]: ['-s', '--scope'],
  [CmdTypeArgs.region]: ['-p', '--region'],
  [CmdTypeArgs.accountId]: ['-a', '--accountId'],
  [CmdTypeArgs.help]: ['-h', '--help']
}

interface CommandLineArguments {
  domain: string | undefined
  repository: string | undefined
  scope: string | undefined
  region: string | undefined
  accountId: string | undefined
  help: string | undefined
}

// eslint-disable-next-line complexity
function assignCommandArg(argType: string, value: string, commandArguments: CommandLineArguments): string | void {
  if (argType === CmdTypeArgs.accountId)
    return commandArguments.accountId = value
  if (argType === CmdTypeArgs.domain)
    return commandArguments.domain = value
  if (argType === CmdTypeArgs.help)
    return commandArguments.help = value
  if (argType === CmdTypeArgs.region)
    return commandArguments.region = value
  if (argType === CmdTypeArgs.repository)
    return commandArguments.repository = value
  if (argType === CmdTypeArgs.scope)
    return commandArguments.scope = value
}

const findArgIndex = (args: string[], cmdArgTypes: string): number => args.findIndex((arg) => cmdArgTypes === arg)

const findArgumentValue = (cmdArgTypes: string[], args: string[]): string | undefined => {
  return cmdArgTypes
    .map((cmdArgTypes) => {
      const valueIndex = findArgIndex(args, cmdArgTypes)
      if (valueIndex === -1)
        return
      return args[valueIndex + 1]
    })
    .filter(x => x)[0]
}

function extractArgument(args: string[]): CommandLineArguments {
  const commandArguments: CommandLineArguments = {
    domain: undefined,
    repository: undefined,
    scope: undefined,
    region: undefined,
    accountId: undefined,
    help: undefined,
  }
  Object.entries(cmdArgs).map(([key, cmdArgTypes]) => {
    const cmdLineValue = findArgumentValue(cmdArgTypes, args)
    if (!cmdLineValue)
      return
    assignCommandArg(key, cmdLineValue, commandArguments)
  })
  return commandArguments
}

enum ExitCode {
  Successful = 0,
  SyntaxError = 1
}

function exitMessage(message: string, exitCode: ExitCode): void {
  console.log(message)
  process.exit(exitCode)
}

function needsHelp(help: string | undefined): void {
  if (help !== undefined)
    exitMessage(manpage, ExitCode.Successful)
}

const isUsingCmdArgs = (args: CommandLineArguments): boolean => Object.values(args).filter(x => x).length > 0

// eslint-disable-next-line complexity
function getCmdArgs(args: CommandLineArguments): awsCodeArtifactConfig {
  const {accountId, domain, region, repository, scope} = args
  if (!accountId)
    throw exitMessage(`Missing ${CmdTypeArgs.accountId}. Please use ${cmdArgs.accountId}`, ExitCode.SyntaxError)

  if (!domain)
    throw exitMessage(`Missing ${CmdTypeArgs.domain} Please use ${cmdArgs.domain}`, ExitCode.SyntaxError)

  if (!region)
    throw exitMessage(`Missing ${CmdTypeArgs.region} Please use ${cmdArgs.region}`, ExitCode.SyntaxError)

  if (!repository)
    throw exitMessage(`Missing ${CmdTypeArgs.repository} Please use ${cmdArgs.repository}`, ExitCode.SyntaxError)

  if (!scope)
    throw exitMessage(`Missing ${CmdTypeArgs.scope} Please use ${cmdArgs.scope}`, ExitCode.SyntaxError)

  return {accountId, domain, region, repository, scope}
}

function getAwsConfig(args: CommandLineArguments): awsCodeArtifactConfig {
  if (isUsingCmdArgs(args))
    return getCmdArgs(args)

  const packageJson = process.env.PACKAGE_FILE ? require(process.env.PACKAGE_FILE) : require( process.cwd() + '/package.json' )

  return packageJson.awsCodeArtifact
}

async function codeArtifactAuthOnCli(): Promise<void> {
  const args = extractArgument(process.argv)
  needsHelp(args.help)
  const config = getAwsConfig(args)
  await main(config)
}

codeArtifactAuthOnCli()
