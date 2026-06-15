import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseVmixInputsFromXml, serializeVmixInputRecords } from '../parseVmixInputsXml.js'
import { VmixInputPoller, FetchLike } from '../VmixInputPoller.js'
import { vmixInputMediaId, vmixInputMediaObjectId, vmixInputToMediaObject } from '../vmixInputMediaObject.js'
import { getVmixPollerConfig } from '../VmixInputPollerManager.js'

const fixtureXml = readFileSync(join(__dirname, 'fixtures', 'vmix-api.xml'), 'utf8')

describe('parseVmixInputsFromXml', () => {
	it('parses Camera, Video, GT and NDI inputs from XML', () => {
		const inputs = parseVmixInputsFromXml(fixtureXml)

		expect(inputs).toHaveLength(4)
		expect(inputs[0]).toMatchObject({
			key: 'abc-123',
			number: 1,
			type: 'Camera',
			title: 'Camera 1 Sony',
			shortTitle: 'Camera 1',
		})
		expect(inputs[1]).toMatchObject({
			key: 'def-456',
			type: 'Video',
			durationFrames: 3600,
		})
		expect(inputs[2]).toMatchObject({
			key: 'ghi-789',
			type: 'GT',
			title: 'LOWER_THIRD',
		})
		expect(inputs[3]).toMatchObject({
			key: 'jkl-012',
			type: 'NDI',
		})
	})
})

describe('VmixInputMediaSync helpers', () => {
	it('builds uppercase mediaId and title mediaPath', () => {
		const record = {
			key: 'abc-123',
			number: 1,
			type: 'Camera',
			title: 'Camera 1 Sony',
			shortTitle: 'Camera 1',
		}

		expect(vmixInputMediaObjectId(record)).toBe('abc-123')
		expect(vmixInputMediaId(record)).toBe('VMIX:INPUT:ABC-123')

		const doc = vmixInputToMediaObject(record)
		expect(doc.mediaPath).toBe('Camera 1 Sony')
		expect(doc.mediaId).toBe('VMIX:INPUT:ABC-123')
		expect(doc.mediainfo?.name).toBe('Camera 1 Sony')
	})
})

describe('getVmixPollerConfig', () => {
	const vmixDevice = (options: Record<string, unknown>) =>
		({
			deviceType: 'VMIX',
			deviceOptions: {
				type: 'VMIX',
				options,
			},
		}) as any

	it('reads extended polling options from vMix device options', () => {
		const config = getVmixPollerConfig(
			vmixDevice({
				host: '10.0.0.5',
				port: 8099,
				inputPollApiPort: 8088,
				inputPollingIntervalMs: 7000,
			})
		)

		expect(config).toEqual({
			host: '10.0.0.5',
			apiPort: 8088,
			pollIntervalMs: 7000,
			disableInputPolling: false,
		})
	})

	it('applies defaults when optional polling fields are missing', () => {
		const config = getVmixPollerConfig(vmixDevice({ host: '10.0.0.5' }))

		expect(config).toEqual({
			host: '10.0.0.5',
			apiPort: 8088,
			pollIntervalMs: 5000,
			disableInputPolling: false,
		})
	})

	it('returns undefined for non-vMix device types', () => {
		expect(
			getVmixPollerConfig({
				deviceType: 'ATEM',
				deviceOptions: { type: 'ATEM', options: { host: '10.0.0.5' } },
			} as any)
		).toBeUndefined()
	})

	it('returns undefined when host is missing', () => {
		expect(getVmixPollerConfig(vmixDevice({ port: 8099 }))).toBeUndefined()
	})
})

describe('VmixInputPoller', () => {
	const flushPromises = async (): Promise<void> => {
		await Promise.resolve()
		await Promise.resolve()
	}

	beforeEach(() => {
		jest.useFakeTimers({ advanceTimers: true })
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('fetchOnce returns correctly typed records', async () => {
		jest.useRealTimers()

		const fetchImpl: FetchLike = jest.fn().mockResolvedValue({
			ok: true,
			text: async () => fixtureXml,
		})

		const poller = new VmixInputPoller('127.0.0.1', 8088, 5000, fetchImpl)
		const inputs = await poller.fetchOnce()

		expect(inputs).toHaveLength(4)
		expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:8088/api', { method: 'GET' })
	})

	it('does not call onUpdate twice when the input list is unchanged', async () => {
		const fetchImpl: FetchLike = jest.fn().mockResolvedValue({
			ok: true,
			text: async () => fixtureXml,
		})
		const onUpdate = jest.fn()

		const poller = new VmixInputPoller('127.0.0.1', 8088, 1000, fetchImpl)
		poller.start(onUpdate)

		await flushPromises()
		expect(onUpdate).toHaveBeenCalledTimes(1)

		jest.advanceTimersByTime(1000)
		await flushPromises()
		expect(onUpdate).toHaveBeenCalledTimes(1)

		poller.stop()
	})

	it('retains last known list and does not throw on HTTP error', async () => {
		let shouldFail = false
		const fetchImpl: FetchLike = jest.fn().mockImplementation(async () => {
			if (shouldFail) {
				return { ok: false, status: 503, text: async () => '' }
			}
			return { ok: true, text: async () => fixtureXml }
		})
		const onUpdate = jest.fn()

		const poller = new VmixInputPoller('127.0.0.1', 8088, 1000, fetchImpl)
		poller.start(onUpdate)

		await flushPromises()
		expect(poller.getLastKnownInputs()).toHaveLength(4)

		shouldFail = true
		jest.advanceTimersByTime(1000)
		await flushPromises()

		expect(poller.getLastKnownInputs()).toHaveLength(4)
		expect(onUpdate).toHaveBeenCalledTimes(1)

		poller.stop()
	})

	it('stop clears the polling interval without throwing', () => {
		const fetchImpl: FetchLike = jest.fn().mockResolvedValue({
			ok: true,
			text: async () => fixtureXml,
		})
		const poller = new VmixInputPoller('127.0.0.1', 8088, 1000, fetchImpl)

		poller.start(jest.fn())
		expect(() => poller.stop()).not.toThrow()
	})
})

describe('serializeVmixInputRecords', () => {
	it('serializes key, title and type for change detection', () => {
		const serialized = serializeVmixInputRecords([
			{
				key: 'abc',
				number: 1,
				type: 'Camera',
				title: 'Cam',
				shortTitle: 'Cam',
			},
		])

		expect(JSON.parse(serialized)).toEqual([{ key: 'abc', title: 'Cam', type: 'Camera' }])
	})
})
