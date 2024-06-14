import CodeArtifact from 'aws-sdk/clients/codeartifact'
import {execSync} from 'child_process'
import {awsCodeArtifactConfig, packageTypes} from './types'

function errorHandler(msg: string): void {
  console.error(msg)
  process.exit(1)
}

// eslint-disable-next-line complexity
function parseConfig(config: awsCodeArtifactConfig): awsCodeArtifactConfig {
  if (!config?.domain)
    errorHandler('Domain does not exist in package.json')

  if (!config?.accountId)
    errorHandler('accountId does not exist in package.json')

  if (!config?.repository)
    errorHandler('repository does not exist in package.json')

  if (!config?.region)
    errorHandler('region does not exist in package.json')

  if (!config?.packageType)
    errorHandler('packageType does not exist in package.json')

  return {
    domain: config.domain,
    accountId: config.accountId,
    repository: config.repository,
    region: config.region,
    scope: config.scope,
    packageType: config.packageType
  }
}

async function getAuthorizationToken(domain: string, accountId: string): Promise<string> {
  const codeArtifact = new CodeArtifact()
  const params = {
    domain,
    domainOwner: accountId,
  }
  const token = await codeArtifact.getAuthorizationToken(params).promise().catch(e => errorHandler(e))
  if (token?.authorizationToken === undefined)
    throw errorHandler('Failed to retrieve auth token')
  return token.authorizationToken
}

function validateAWSConfigVariables(): void {
  if (!process.env.AWS_REGION)
    errorHandler('Missing AWS region environment variable. Please make sure that you assume a role!')
  if (!process.env.AWS_SESSION_TOKEN)
    errorHandler('Missing AWS session token environment variable. Please make sure that you assume a role!')
  if (!process.env.AWS_SECRET_ACCESS_KEY)
    errorHandler('Missing AWS serect access key environment variable. Please make sure that you assume a role!')
  if (!process.env.AWS_ACCESS_KEY_ID)
    errorHandler('Missing AWS access key id environment variable. Please make sure that you assume a role!')
}

function npmVersionIsLowerThan(version: number): boolean {
  const npmVersion = execSync('npm --version').toString()
  const npmMajorVersion = Number(npmVersion.split('.')[0])
  console.log(`npm major verions: ${npmMajorVersion}`)

  if (isNaN(npmMajorVersion)) {
    console.error(`Invalid version returned: ${npmVersion}`)
    throw new Error('Could not find npm version')
  }
  return npmMajorVersion < version
}

function getScopeTarget(scope: string | undefined): string {
  if (scope)
    return `${scope}:registry`

  console.log('Scope has not been set, setting as default registry')
  return 'registry'
}

async function setNpmConfig(config: awsCodeArtifactConfig): Promise<void> {
  const {domain, accountId, region, repository, scope} = parseConfig(config)

  const token = await getAuthorizationToken(domain, accountId)
  const codeartifactUrl = `${domain}-${accountId}.d.codeartifact.${region}.amazonaws.com/npm/${repository}/`
  const endpoint = `//${codeartifactUrl}`
  const scopeTarget = getScopeTarget(scope)

  execSync(`npm config set ${scopeTarget} https://${codeartifactUrl}`)
  execSync(`npm config set ${endpoint}:_authToken=${token}`)

  if (npmVersionIsLowerThan(9)) {
    console.log('Legacy version of NPM detected setting always-auth')
    execSync(`npm config set ${endpoint}:always-auth=true`)
  }
  console.log(`npm credentials configured for endpoint: ${codeartifactUrl}`)
}

async function setPoetryConfig(config: awsCodeArtifactConfig): Promise<void> {
  const {domain, accountId} = parseConfig(config)

  const token = await getAuthorizationToken(domain, accountId)

  execSync(`poetry config http-basic.mondo "aws" "${token}"`)

  console.log('Set codeartifact credentials for poetry')

}

export async function main(config: awsCodeArtifactConfig): Promise<void> {
  validateAWSConfigVariables()
  if (config.packageType === packageTypes.npm)
    await setNpmConfig(config)
  else if (config.packageType === packageTypes.poetry)
    await setPoetryConfig(config)
  else
    throw new Error(`invalid package type: ${config.packageType}, supported types: ${JSON.stringify(packageTypes)}`)

}
