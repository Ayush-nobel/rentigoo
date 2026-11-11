import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sent: { name: string; input: unknown }[] = []
let jobs: { status: string }[] = []
let fail = false
vi.mock('@aws-sdk/client-amplify', () => {
  class Cmd {
    constructor(public input: unknown) {}
  }
  class ListJobsCommand extends Cmd {}
  class StartJobCommand extends Cmd {}
  class AmplifyClient {
    async send(c: Cmd) {
      if (fail) throw new Error('AccessDenied')
      sent.push({ name: c.constructor.name, input: c.input })
      return c instanceof ListJobsCommand ? { jobSummaries: jobs } : { jobSummary: { jobId: '42' } }
    }
  }
  return { AmplifyClient, ListJobsCommand, StartJobCommand }
})

const { requestRebuild } = await import('./rebuild')

describe('requestRebuild', () => {
  beforeEach(() => {
    sent.length = 0
    jobs = []
    fail = false
    process.env.REBUILD_APP_ID = 'app123'
    process.env.REBUILD_BRANCH = 'main'
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    delete process.env.REBUILD_APP_ID
    delete process.env.REBUILD_BRANCH
  })

  it('does nothing outside production (no app settings)', async () => {
    delete process.env.REBUILD_APP_ID
    await requestRebuild('test')
    expect(sent).toEqual([])
  })

  it('starts a release build of the branch', async () => {
    jobs = [{ status: 'SUCCEED' }, { status: 'RUNNING' }]
    await requestRebuild('new listing')
    expect(sent.map((s) => s.name)).toEqual(['ListJobsCommand', 'StartJobCommand'])
    expect(sent[1]!.input).toMatchObject({ appId: 'app123', branchName: 'main', jobType: 'RELEASE' })
  })

  it('skips when a build is already waiting', async () => {
    jobs = [{ status: 'PENDING' }, { status: 'RUNNING' }]
    await requestRebuild('new listing')
    expect(sent.map((s) => s.name)).toEqual(['ListJobsCommand'])
  })

  it('never throws', async () => {
    fail = true
    await expect(requestRebuild('new listing')).resolves.toBeUndefined()
  })
})
