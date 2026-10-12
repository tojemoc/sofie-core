import { Meteor } from 'meteor/meteor'
import { check } from '../../lib/check'
import { MethodContext } from '../methodContext'
import { checkAccessAndGetPeripheralDevice } from '../../security/check'
import { PeripheralDeviceId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { RundownPartSettingsResponse } from '@sofie-automation/shared-lib/dist/peripheralDevice/rundownPartSettings'
import { Parts, Rundowns } from '../../collections'

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

		const empty: RundownPartSettingsResponse = {
			rundownExternalId,
			parts: [],
		}

		const rundown = await Rundowns.findOneAsync({
			studioId,
			externalId: rundownExternalId,
		})
		if (!rundown) {
			return empty
		}

		const parts = await Parts.findFetchAsync({ rundownId: rundown._id }, { sort: { _rank: 1 } })

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
