import {
	PERIPHERAL_SUBTYPE_PROCESS,
	PeripheralDevice,
	PeripheralDeviceCategory,
	PeripheralDeviceType,
} from '@sofie-automation/corelib/dist/dataModel/PeripheralDevice'
import { UserActionAPIMethods } from '@sofie-automation/meteor-lib/dist/api/userActions'
import { protectString } from '@sofie-automation/shared-lib/dist/lib/protectedString'

import {
	DefaultEnvironment,
	setupDefaultStudioEnvironment,
	setupMockPeripheralDevice,
} from '../../../__mocks__/helpers/database'
import { getCurrentTime } from '../../../lib/lib'
import { ServerUserActionAPI } from '../../userActions'

import '../../../__mocks__/_extendJest'

import { DBStudio, StudioPlayoutDevice } from '@sofie-automation/corelib/dist/dataModel/Studio'
import {
	applyAndValidateOverrides,
	wrapDefaultObject,
} from '@sofie-automation/corelib/dist/settings/objectWithOverrides'
import { JSONBlobStringify } from '@sofie-automation/shared-lib/dist/lib/JSONBlob'
import { literal } from '@sofie-automation/shared-lib/dist/lib/lib'

import { makeMeteorCallForTest } from '../../../__mocks__/helpers/methods'
import { Studios } from '../../../collections'

const MeteorCall = makeMeteorCallForTest({ methods: UserActionAPIMethods, class: ServerUserActionAPI })

describe('User Actions - Disable Peripheral SubDevice', () => {
	let env: DefaultEnvironment
	let pDevice: PeripheralDevice
	const mockSubDeviceId = 'mockSubDevice0'

	beforeEach(async () => {
		env = await setupDefaultStudioEnvironment()
		pDevice = await setupMockPeripheralDevice(
			PeripheralDeviceCategory.PLAYOUT,
			PeripheralDeviceType.PLAYOUT,
			PERIPHERAL_SUBTYPE_PROCESS,
			env.studio,
			{
				configManifest: {
					deviceConfigSchema: JSONBlobStringify({}), // unused
					subdeviceManifest: {
						dummy: {
							displayName: 'Test device',
							configSchema: JSONBlobStringify({}), // unused
						},
					},
					subdeviceConfigSchema: JSONBlobStringify({
						// Based on 'common-options' from TSR
						$schema: 'https://json-schema.org/draft/2020-12/schema',
						title: 'Device Common Options',
						type: 'object',
						properties: {
							disable: {
								type: 'boolean',
								'ui:title': 'Disable',
								default: false,
							},
						},
						required: [],
						// additionalProperties: false,
					}),
				},
			}
		)

		await Studios.updateAsync(env.studio._id, {
			$set: {
				[`peripheralDeviceSettings.playoutDevices`]: wrapDefaultObject({
					[mockSubDeviceId]: literal<StudioPlayoutDevice>({
						peripheralDeviceId: pDevice._id,
						options: {
							type: 'dummy' as any,
							disable: false,
						},
					}),
				}),
			},
		})

		jest.resetAllMocks()
	})
	test('disable existing subDevice', async () => {
		await expect(
			MeteorCall.userAction.disablePeripheralSubDevice('e', getCurrentTime(), pDevice._id, mockSubDeviceId, true)
		).resolves.toMatchObject({
			success: 200,
		})

		const studio = (await Studios.findOneAsync(env.studio._id)) as DBStudio
		expect(studio).toBeDefined()
		const playoutDevices = applyAndValidateOverrides(studio.peripheralDeviceSettings.playoutDevices).obj
		expect(playoutDevices[mockSubDeviceId].options.disable).toBe(true)
	})
	test('enable existing subDevice', async () => {
		{
			await expect(
				MeteorCall.userAction.disablePeripheralSubDevice(
					'e',
					getCurrentTime(),
					pDevice._id,
					mockSubDeviceId,
					true
				)
			).resolves.toMatchObject({
				success: 200,
			})

			const studio = (await Studios.findOneAsync(env.studio._id)) as DBStudio
			expect(studio).toBeDefined()
			const playoutDevices = applyAndValidateOverrides(studio.peripheralDeviceSettings.playoutDevices).obj
			expect(playoutDevices[mockSubDeviceId].options.disable).toBe(true)
		}

		{
			await expect(
				MeteorCall.userAction.disablePeripheralSubDevice(
					'e',
					getCurrentTime(),
					pDevice._id,
					mockSubDeviceId,
					false
				)
			).resolves.toMatchObject({
				success: 200,
			})

			const studio = (await Studios.findOneAsync(env.studio._id)) as DBStudio
			expect(studio).toBeDefined()
			const playoutDevices = applyAndValidateOverrides(studio.peripheralDeviceSettings.playoutDevices).obj
			expect(playoutDevices[mockSubDeviceId].options.disable).toBe(false)
		}
	})
	test('edit missing subDevice throws an error', async () => {
		await expect(
			MeteorCall.userAction.disablePeripheralSubDevice(
				'e',
				getCurrentTime(),
				pDevice._id,
				'nonExistentSubDevice',
				true
			)
		).resolves.toMatchUserRawError(/is not configured/)
	})
	test('edit missing device throws an error', async () => {
		await expect(
			MeteorCall.userAction.disablePeripheralSubDevice(
				'e',
				getCurrentTime(),
				protectString('nonExistentDevice'),
				'nonExistentSubDevice',
				true
			)
		).resolves.toMatchUserRawError(/not found/)
	})
	test("edit device that doesn't support the disable property throws an error", async () => {
		const pDeviceUnsupported = await setupMockPeripheralDevice(
			PeripheralDeviceCategory.PLAYOUT,
			PeripheralDeviceType.PLAYOUT,
			PERIPHERAL_SUBTYPE_PROCESS,
			env.studio,
			{
				configManifest: {
					deviceConfigSchema: JSONBlobStringify({}), // unused
					subdeviceManifest: {
						dummy: {
							displayName: 'Test device',
							configSchema: JSONBlobStringify({}), // unused
						},
					},
					subdeviceConfigSchema: JSONBlobStringify({
						// Based on 'common-options' from TSR
						$schema: 'https://json-schema.org/draft/2020-12/schema',
						title: 'Device Common Options',
						type: 'object',
						properties: {
							disable: {
								type: 'string',
								'ui:title': 'Mislabeled property',
								default: false,
							},
						},
						required: [],
						// additionalProperties: false,
					}),
				},
			}
		)

		await Studios.updateAsync(env.studio._id, {
			$set: {
				[`peripheralDeviceSettings.playoutDevices.defaults.${mockSubDeviceId}.peripheralDeviceId`]:
					pDeviceUnsupported._id,
			},
		})

		await expect(
			MeteorCall.userAction.disablePeripheralSubDevice(
				'e',
				getCurrentTime(),
				pDeviceUnsupported._id,
				mockSubDeviceId,
				true
			)
		).resolves.toMatchUserRawError(/does not support the disable property/)
	})
})
