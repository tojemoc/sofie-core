import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Tooltip from 'rc-tooltip'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { TSR } from '@sofie-automation/blueprints-integration'
import { PeripheralDeviceCategory } from '@sofie-automation/corelib/dist/dataModel/PeripheralDevice'
import { literal } from '@sofie-automation/corelib/dist/lib'
import { wrapDefaultObject } from '@sofie-automation/corelib/dist/settings/objectWithOverrides'
import type { StudioId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import type { PeripheralDevice } from '@sofie-automation/corelib/dist/dataModel/PeripheralDevice'
import type { StudioPlayoutDevice } from '@sofie-automation/corelib/dist/dataModel/Studio'
import type {
	ObjectOverrideSetOp,
	ObjectWithOverrides,
} from '@sofie-automation/corelib/dist/settings/objectWithOverrides'

import { Studios } from '../../../../collections/index.js'
import { getHelpMode } from '../../../../lib/localStorage.js'
import { useTracker } from '../../../../lib/ReactMeteorData/ReactMeteorData.js'
import { getAllCurrentAndDeletedItemsFromOverrides } from '../../util/OverrideOpHelper.js'
import { GenericSubDevicesTable } from './GenericSubDevices.js'
import { useStagedSubDeviceOverrides } from './useStagedSubDeviceOverrides.js'

interface StudioPlayoutSubDevicesProps {
	studioId: StudioId
	studioDevices: PeripheralDevice[]
}
export function StudioPlayoutSubDevices({
	studioId,
	studioDevices,
}: Readonly<StudioPlayoutSubDevicesProps>): JSX.Element {
	const { t } = useTranslation()

	const studio = useTracker(() => Studios.findOne(studioId), [studioId])

	const baseSettings = useMemo<ObjectWithOverrides<Record<string, StudioPlayoutDevice>>>(
		() => studio?.peripheralDeviceSettings?.playoutDevices ?? wrapDefaultObject({}),
		[studio?.peripheralDeviceSettings?.playoutDevices]
	)

	const {
		settingsWithOverrides: deviceSettings,
		batchedOverrideHelper: batchedOverridesHelper,
		instantSaveOverrideHelper,
		hasUnsavedChangesForItem,
		discardItemChanges,
		saveItemChanges,
		updateObjectId,
		updatedIds,
	} = useStagedSubDeviceOverrides<StudioPlayoutDevice>({
		studioId: studio?._id,
		baseSettings,
		overridePath: 'peripheralDeviceSettings.playoutDevices.overrides',
		relatedItemsMode: 'direct',
		clearSavedItemFromStaged: false,
	})

	const wrappedSubDevices = useMemo(
		() =>
			getAllCurrentAndDeletedItemsFromOverrides<StudioPlayoutDevice>(deviceSettings, (a, b) =>
				a[0].localeCompare(b[0])
			),
		[deviceSettings]
	)

	const filteredPeripheralDevices = useMemo(
		() => studioDevices.filter((d) => d.category === PeripheralDeviceCategory.PLAYOUT),
		[studioDevices]
	)

	const addNewItem = useCallback(() => {
		const existingDevices = new Set(wrappedSubDevices.map((d) => d.id))
		let idx = 0
		while (existingDevices.has(`device${idx}`)) {
			idx++
		}

		const newId = `device${idx}`
		const newDevice = literal<StudioPlayoutDevice>({
			peripheralDeviceId: undefined,
			options: {
				type: TSR.DeviceType.ABSTRACT,
			},
		})

		const addOp = literal<ObjectOverrideSetOp>({
			op: 'set',
			path: newId,
			value: newDevice,
		})

		Studios.update(studioId, {
			$push: {
				'peripheralDeviceSettings.playoutDevices.overrides': addOp,
			},
		})
	}, [studioId, wrappedSubDevices])

	return (
		<div className="mb-4">
			<h2 className="mb-2">
				<Tooltip
					overlay={t('Playout devices are needed to control your studio hardware')}
					visible={getHelpMode() && !wrappedSubDevices.length}
					placement="right"
				>
					<span>{t('Playout Devices')}</span>
				</Tooltip>
			</h2>

			<GenericSubDevicesTable
				subDevices={wrappedSubDevices}
				overrideHelper={batchedOverridesHelper}
				instantSaveOverrideHelper={instantSaveOverrideHelper}
				peripheralDevices={filteredPeripheralDevices}
				hasUnsavedChangesForItem={hasUnsavedChangesForItem}
				saveItemChanges={saveItemChanges}
				discardItemChanges={discardItemChanges}
				updateObjectId={updateObjectId}
				updatedIds={updatedIds}
			/>

			<div className="my-1 mx-2">
				<button className="btn btn-primary" onClick={addNewItem}>
					<FontAwesomeIcon icon={faPlus} />
				</button>
			</div>
		</div>
	)
}
