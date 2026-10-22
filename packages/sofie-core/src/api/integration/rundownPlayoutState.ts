import { Meteor } from 'meteor/meteor'
import { check } from '../../lib/check'
import { MethodContext } from '../methodContext'
import { checkAccessAndGetPeripheralDevice } from '../../security/check'
import { PartInstanceId, PeripheralDeviceId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { RundownPlayoutStateResponse } from '@sofie-automation/shared-lib/dist/peripheralDevice/rundownPlayoutState'
import { PartInstances, RundownPlaylists, Rundowns } from '../../collections'
import { SelectedPartInstance } from '@sofie-automation/corelib/dist/dataModel/RundownPlaylist/RundownPlaylist'

async function resolvePartExternalId(partInstanceId: PartInstanceId | undefined): Promise<string | null> {
	if (!partInstanceId) {
		return null
	}

	const partInstance = await PartInstances.findOneAsync(partInstanceId, {
		projection: {
			'part.externalId': 1,
		} as any,
	})

	return partInstance?.part?.externalId ?? null
}

async function resolveSelectedPartExternalId(
	selected: SelectedPartInstance | null | undefined
): Promise<string | null> {
	return resolvePartExternalId(selected?.partInstanceId)
}

export namespace RundownPlayoutStateIntegration {
	/**
	 * Return previous / current / next part external ids for a rundown owned by this ingest device's studio.
	 * Used by Rundown Editor to show on-air state and apply System edit locks.
	 */
	export async function getRundownPlayoutState(
		context: MethodContext,
		deviceId: PeripheralDeviceId,
		deviceToken: string,
		rundownExternalId: string
	): Promise<RundownPlayoutStateResponse> {
		check(rundownExternalId, String)

		const peripheralDevice = await checkAccessAndGetPeripheralDevice(deviceId, deviceToken, context)
		if (!peripheralDevice.studioAndConfigId) {
			throw new Meteor.Error(400, `Device "${peripheralDevice._id}" has no studio`)
		}

		const studioId = peripheralDevice.studioAndConfigId.studioId

		const empty: RundownPlayoutStateResponse = {
			rundownExternalId,
			activated: false,
			rehearsal: false,
			previousPartExternalId: null,
			currentPartExternalId: null,
			nextPartExternalId: null,
		}

		const rundown = await Rundowns.findOneAsync({
			studioId,
			externalId: rundownExternalId,
		})
		if (!rundown) {
			return empty
		}

		const playlist = await RundownPlaylists.findOneAsync(rundown.playlistId)
		if (!playlist?.activationId) {
			return empty
		}

		const [previousPartExternalId, currentPartExternalId, nextPartExternalId] = await Promise.all([
			resolveSelectedPartExternalId(playlist.previousPartInfo),
			resolveSelectedPartExternalId(playlist.currentPartInfo),
			resolveSelectedPartExternalId(playlist.nextPartInfo),
		])

		return {
			rundownExternalId,
			activated: true,
			rehearsal: Boolean(playlist.rehearsal),
			previousPartExternalId,
			currentPartExternalId,
			nextPartExternalId,
		}
	}
}
