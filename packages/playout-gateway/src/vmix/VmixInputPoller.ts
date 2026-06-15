import type { Logger } from 'winston'
import { parseVmixInputsFromXml, serializeVmixInputRecords } from './parseVmixInputsXml.js'
import { VmixInputRecord } from './types.js'

export type { VmixInputRecord } from './types.js'
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>

export class VmixInputPoller {
	private intervalHandle: ReturnType<typeof setInterval> | undefined
	private lastSerializedInputs = ''
	private lastKnownInputs: VmixInputRecord[] = []
	private running = false

	constructor(
		private readonly vmixHost: string,
		private readonly vmixPort = 8088,
		private readonly pollIntervalMs = 5000,
		private readonly fetchImpl: FetchLike = fetch,
		private readonly logger?: Logger
	) {}

	start(onUpdate: (inputs: VmixInputRecord[]) => void): void {
		this.stop()
		this.running = true

		void this.pollOnce(onUpdate)

		this.intervalHandle = setInterval(() => {
			void this.pollOnce(onUpdate)
		}, this.pollIntervalMs)
	}

	stop(): void {
		this.running = false
		if (this.intervalHandle !== undefined) {
			clearInterval(this.intervalHandle)
			this.intervalHandle = undefined
		}
	}

	async fetchOnce(): Promise<VmixInputRecord[]> {
		const url = `http://${this.vmixHost}:${this.vmixPort}/api`
		const response = await this.fetchImpl(url, { method: 'GET' })

		if (!response.ok) {
			throw new Error(`vMix API responded with HTTP ${response.status}`)
		}

		const xmlBody = await response.text()
		return parseVmixInputsFromXml(xmlBody)
	}

	private async pollOnce(onUpdate: (inputs: VmixInputRecord[]) => void): Promise<void> {
		if (!this.running) return

		try {
			const inputs = await this.fetchOnce()
			this.lastKnownInputs = inputs

			const serialized = serializeVmixInputRecords(inputs)
			if (serialized === this.lastSerializedInputs) return

			this.lastSerializedInputs = serialized
			onUpdate(inputs)
		} catch (error) {
			this.logger?.warn(`vMix input poll failed for ${this.vmixHost}:${this.vmixPort}: ${String(error)}`)
		}
	}

	getLastKnownInputs(): VmixInputRecord[] {
		return this.lastKnownInputs
	}
}
