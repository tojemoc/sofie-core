import { z } from 'zod'

import { RundownPlaylistId, SegmentId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { SofieError } from '@sofie-automation/corelib/dist/error'
import { IngestJobs } from '@sofie-automation/corelib/dist/worker/ingest'
import { StudioJobs } from '@sofie-automation/corelib/dist/worker/studio'

import { RundownPlaylists, Rundowns, Segments } from '../../collections'
import { check } from '../../lib/check'
import { logger } from '../../logging'
import { MeteorDebugMethod } from '../../methods'
import { QueueStudioJob } from '../../worker/worker'
import { runIngestOperation } from './lib'

export const ingestDebugMethods: { [key: string]: MeteorDebugMethod } = {
	/**
	 * Simulate a 'Reload from NRCS' for the specified playlist
	 */
	debug_playlistRunBlueprints: async (rundownPlaylistId: RundownPlaylistId) => {
		try {
			check(rundownPlaylistId, z.string())

			const playlist = await RundownPlaylists.findOneAsync(rundownPlaylistId)
			if (!playlist) throw new Error('Playlist not found')

			const job = await QueueStudioJob(StudioJobs.RegeneratePlaylist, playlist.studioId, {
				playlistId: playlist._id,
			})
			await job.complete
		} catch (e) {
			logger.error(e)
			throw e
		}
	},
	/**
	 * Simulate a 'Reload from NRCS' for a particular segment in a rundown
	 * Getting the segmentId is tricky, but can be done by either inspecting the DOM, or the mongo database
	 */
	debug_segmentRunBlueprints: async (segmentId: SegmentId) => {
		check(segmentId, z.string())

		const segment = await Segments.findOneAsync(segmentId)
		if (!segment) throw new SofieError(404, 'Segment not found')
		const rundown = await Rundowns.findOneAsync(segment.rundownId)
		if (!rundown) throw new SofieError(404, 'Rundown not found')

		await runIngestOperation(rundown.studioId, IngestJobs.RegenerateSegment, {
			rundownExternalId: rundown.externalId,
			segmentExternalId: segment.externalId,
		})
	},
}
