import type { Logger } from 'winston'
import type { CoreTSRDeviceHandler } from '../coreHandler.js'
import { VmixInputRecord } from './types.js'
import { vmixInputCollectionId, vmixInputMediaObjectId, vmixInputToMediaObject } from './vmixInputMediaObject.js'

export {
	vmixInputCollectionId,
	vmixInputMediaObjectId,
	vmixInputMediaId,
	vmixInputToMediaObject,
} from './vmixInputMediaObject.js'

export class VmixInputMediaSync {
	private readonly collectionId: string
	private knownObjIds = new Set<string>()

	constructor(
		private readonly coreTsrHandler: CoreTSRDeviceHandler,
		deviceId: string,
		private readonly logger: Logger
	) {
		this.collectionId = vmixInputCollectionId(deviceId)
	}

	async syncInputs(inputs: VmixInputRecord[]): Promise<void> {
		const nextObjIds = new Set<string>()

		for (const input of inputs) {
			const objId = vmixInputMediaObjectId(input)
			nextObjIds.add(objId)

			try {
				this.coreTsrHandler.onUpdateMediaObject(this.collectionId, objId, vmixInputToMediaObject(input))
			} catch (error) {
				this.logger.warn(`Failed to push vMix input mediaObject ${objId}: ${String(error)}`)
			}
		}

		for (const objId of this.knownObjIds) {
			if (nextObjIds.has(objId)) continue

			try {
				this.coreTsrHandler.onUpdateMediaObject(this.collectionId, objId, null)
			} catch (error) {
				this.logger.warn(`Failed to remove vMix input mediaObject ${objId}: ${String(error)}`)
			}
		}

		this.knownObjIds = nextObjIds
	}
}
