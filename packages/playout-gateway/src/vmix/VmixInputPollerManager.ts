import type { DeviceOptionsAny } from 'timeline-state-resolver'
import type { BaseRemoteDeviceIntegration } from 'timeline-state-resolver/dist/service/remoteDeviceInstance'

const VMIX_DEVICE_TYPE = 'VMIX'
import type { Logger } from 'winston'
import type { CoreTSRDeviceHandler } from '../coreHandler.js'
import { VmixExtendedDeviceOptions, VmixPollerConfig } from './types.js'
import { VmixInputMediaSync } from './VmixInputMediaSync.js'
import { VmixInputPoller } from './VmixInputPoller.js'

interface ActivePoller {
	poller: VmixInputPoller
	sync: VmixInputMediaSync
}

export function getVmixPollerConfig(
	device: BaseRemoteDeviceIntegration<DeviceOptionsAny>
): VmixPollerConfig | undefined {
	if ((device.deviceType as string) !== VMIX_DEVICE_TYPE) return undefined

	const options = device.deviceOptions.options as VmixExtendedDeviceOptions | undefined
	if (!options?.host) return undefined

	return {
		host: options.host,
		apiPort: options.inputPollApiPort ?? 8088,
		pollIntervalMs: options.inputPollingIntervalMs ?? 5000,
		disableInputPolling: options.disableInputPolling ?? false,
	}
}

export class VmixInputPollerManager {
	private readonly activePollers = new Map<string, ActivePoller>()

	start(deviceId: string, coreTsrHandler: CoreTSRDeviceHandler, config: VmixPollerConfig, logger: Logger): void {
		this.stop(deviceId)

		if (config.disableInputPolling) {
			logger.debug(`vMix input polling disabled for device ${deviceId}`)
			return
		}

		const sync = new VmixInputMediaSync(coreTsrHandler, deviceId, logger)
		const poller = new VmixInputPoller(config.host, config.apiPort, config.pollIntervalMs, fetch, logger)

		poller.start((inputs) => {
			sync.syncInputs(inputs).catch((error) => {
				logger.warn(`Failed to sync vMix inputs to Core for device ${deviceId}: ${String(error)}`)
			})
		})

		this.activePollers.set(deviceId, { poller, sync })
		logger.info(
			`Started vMix input polling for device ${deviceId} at http://${config.host}:${config.apiPort}/api every ${config.pollIntervalMs}ms`
		)
	}

	stop(deviceId: string): void {
		const active = this.activePollers.get(deviceId)
		if (!active) return

		active.poller.stop()
		this.activePollers.delete(deviceId)
	}

	stopAll(): void {
		for (const deviceId of [...this.activePollers.keys()]) {
			this.stop(deviceId)
		}
	}
}
