import { AmplifyClient, ListJobsCommand, StartJobCommand } from '@aws-sdk/client-amplify'

const amplify = new AmplifyClient({})

/**
 * Asks Amplify Hosting to rebuild the site, so a new or changed listing gets
 * its own prerendered page (and leaves the sitemap when it's gone).
 *
 * - Only where REBUILD_APP_ID and REBUILD_BRANCH are set: the production
 *   branch (see backend.ts). Sandboxes do nothing.
 * - At most one build waits in the queue: if one is already pending, it will
 *   read the latest listings when it starts, so another isn't needed. A build
 *   that's already running may have read them already, so one more is queued.
 * - Never throws: a failed rebuild request mustn't fail someone's save.
 */
export async function requestRebuild(reason: string): Promise<void> {
  const appId = process.env.REBUILD_APP_ID
  const branchName = process.env.REBUILD_BRANCH
  if (!appId || !branchName) return
  try {
    const { jobSummaries = [] } = await amplify.send(new ListJobsCommand({ appId, branchName, maxResults: 5 }))
    if (jobSummaries.some((j) => j.status === 'PENDING')) {
      console.log(`rebuild skipped (${reason}): a build is already queued`)
      return
    }
    const { jobSummary } = await amplify.send(new StartJobCommand({ appId, branchName, jobType: 'RELEASE', jobReason: `Listings changed: ${reason}`.slice(0, 255) }))
    console.log(`rebuild started (${reason}): job ${jobSummary?.jobId}`)
  } catch (e) {
    console.error('rebuild request failed', e)
  }
}
