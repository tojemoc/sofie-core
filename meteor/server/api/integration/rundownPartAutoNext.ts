import { Meteor } from 'meteor/meteor'
import { check } from '../../lib/check'
import { MethodContext } from '../methodContext'
import { checkAccessAndGetPeripheralDevice } from '../../security/check'
import { PeripheralDeviceId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import {
	RundownPartAutoNextItem,
	RundownPartAutoNextResponse,
} from '@sofie-automation/shared-lib/dist/peripheralDevice/rundownPartAutoNext'
import { Parts, Rundowns } from '../../collections'

export namespace RundownPartAutoNextIntegration {
	/**
	 * Return stored Part.autoNext / autoNextOverlap / expectedDuration for a rundown owned by this
	 * device's studio. Read-only — reads what blueprints stored, does not re-derive anything.
	 * Unknown rundowns (or rundowns of other studios) yield an empty result.
	 */
	export async function getRundownPartAutoNext(
		context: MethodContext,
		deviceId: PeripheralDeviceId,
		deviceToken: string,
		rundownExternalId: string
	): Promise<RundownPartAutoNextResponse> {
		check(rundownExternalId, String)

		const peripheralDevice = await checkAccessAndGetPeripheralDevice(deviceId, deviceToken, context)
		if (!peripheralDevice.studioAndConfigId) {
			throw new Meteor.Error(400, `Device "${peripheralDevice._id}" has no studio`)
		}

		const rundown = await Rundowns.findOneAsync(
			{ studioId: peripheralDevice.studioAndConfigId.studioId, externalId: rundownExternalId },
			{ projection: { _id: 1 } }
		)
		if (!rundown) {
			return { rundownExternalId, parts: {} }
		}

		const parts = await Parts.findFetchAsync(
			{ rundownId: rundown._id },
			{ projection: { externalId: 1, autoNext: 1, autoNextOverlap: 1, expectedDuration: 1 } }
		)

		const result: Record<string, RundownPartAutoNextItem> = {}
		for (const part of parts) {
			const item: RundownPartAutoNextItem = { autoNext: Boolean(part.autoNext) }
			if (typeof part.autoNextOverlap === 'number') item.autoNextOverlap = part.autoNextOverlap
			if (typeof part.expectedDuration === 'number' && part.expectedDuration > 0)
				item.expectedDuration = part.expectedDuration
			result[part.externalId] = item
		}

		return { rundownExternalId, parts: result }
	}
}
