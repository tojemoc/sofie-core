import { Meteor } from 'meteor/meteor'
import { check } from '../../lib/check'
import { MethodContext } from '../methodContext'
import { checkAccessAndGetPeripheralDevice } from '../../security/check'
import { PeripheralDeviceId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { RundownPartSettingsResponse } from '@sofie-automation/shared-lib/dist/peripheralDevice/rundownPartSettings'
import { sortPartsInSortedSegments } from '@sofie-automation/corelib/dist/playout/playlist'
import { Parts, Rundowns, Segments } from '../../collections'

export namespace RundownPartSettingsIntegration {
	/**
	 * Return stored Part.autoNext / expectedDuration for a rundown owned by this
	 * ingest device's studio. Read-only — does not re-derive AUTO.
	 */
	export async function getRundownPartSettings(
		context: MethodContext,
		deviceId: PeripheralDeviceId,
		deviceToken: string,
		rundownExternalId: string
	): Promise<RundownPartSettingsResponse> {
		check(rundownExternalId, String)

		const peripheralDevice = await checkAccessAndGetPeripheralDevice(deviceId, deviceToken, context)
		if (!peripheralDevice.studioAndConfigId) {
			throw new Meteor.Error(400, `Device "${peripheralDevice._id}" has no studio`)
		}

		const studioId = peripheralDevice.studioAndConfigId.studioId

		const rundown = await Rundowns.findOneAsync({
			studioId,
			externalId: rundownExternalId,
		})
		if (!rundown) {
			throw new Meteor.Error(404, `Rundown "${rundownExternalId}" not found`)
		}

		const [segments, unsortedParts] = await Promise.all([
			Segments.findFetchAsync({ rundownId: rundown._id }, { sort: { _rank: 1 }, projection: { _id: 1 } }),
			Parts.findFetchAsync(
				{ rundownId: rundown._id },
				{
					projection: {
						_id: 1,
						segmentId: 1,
						externalId: 1,
						autoNext: 1,
						expectedDuration: 1,
						publicData: 1,
						_rank: 1,
					},
				}
			),
		])
		const parts = sortPartsInSortedSegments(unsortedParts, segments)

		return {
			rundownExternalId,
			parts: parts.map((part) => {
				const publicData = part.publicData
				const autoNextSource =
					typeof publicData === 'object' &&
					publicData !== null &&
					'autoNextSource' in publicData &&
					publicData.autoNextSource === 'blueprint'
						? 'blueprint'
						: undefined

				return {
					partExternalId: part.externalId,
					autoNext: Boolean(part.autoNext),
					expectedDuration:
						typeof part.expectedDuration === 'number' && part.expectedDuration > 0
							? part.expectedDuration
							: null,
					...(autoNextSource ? { autoNextSource } : {}),
				}
			}),
		}
	}
}
