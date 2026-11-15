import {
	BlueprintManifestType,
	BlueprintResultApplySystemConfig,
	IBlueprintTriggeredActions,
	SystemBlueprintManifest,
} from '@sofie-automation/blueprints-integration'
import { CoreSystemId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { SofieError } from '@sofie-automation/corelib/dist/error'
import { protectString } from '@sofie-automation/corelib/dist/protectedString'
import {
	DEFAULT_CONFIRM_KEY_CODE,
	DEFAULT_MAXIMUM_DATA_AGE,
	DEFAULT_POISON_KEY,
} from '@sofie-automation/shared-lib/dist/core/constants'
import { ICoreSystemSettings } from '@sofie-automation/shared-lib/dist/core/model/CoreSystemSettings'

import { evalBlueprint } from '../../api/blueprints/cache'
import { Blueprints, CoreSystem } from '../../collections'
import { logger } from '../../logging'
import { CoreSystemApplyConfigContext } from './context'
import { DEFAULT_CORE_TRIGGERS } from './defaultSystemActionTriggers'
import { updateTriggeredActionsForShowStyleBaseId } from './lib'

export async function runUpgradeForCoreSystem(coreSystemId: CoreSystemId): Promise<void> {
	logger.info(`Running upgrade for CoreSystem`)

	const { coreSystem, blueprint, blueprintManifest } = await loadCoreSystemAndBlueprint(coreSystemId)

	let result: BlueprintResultApplySystemConfig

	if (blueprintManifest && typeof blueprintManifest.applyConfig === 'function') {
		const blueprintContext = new CoreSystemApplyConfigContext(
			'applyConfig',
			`coreSystem:${coreSystem._id},blueprint:${blueprint.blueprintId}`
		)

		result = blueprintManifest.applyConfig(blueprintContext)
	} else {
		// Ensure some defaults are populated when no blueprint method is present
		result = generateDefaultSystemConfig()
	}

	const coreSystemSettings: ICoreSystemSettings = result.settings

	await CoreSystem.updateAsync(coreSystemId, {
		$set: {
			'settingsWithOverrides.defaults': coreSystemSettings,
			lastBlueprintConfig: {
				blueprintHash: blueprint?.blueprintHash ?? 'default',
				blueprintId: blueprint?._id ?? protectString('default'),
				blueprintConfigPresetId: undefined,
				config: {},
			},
		},
	})

	await updateTriggeredActionsForShowStyleBaseId(null, result.triggeredActions)
}

async function loadCoreSystemAndBlueprint(coreSystemId: CoreSystemId) {
	const coreSystem = await CoreSystem.findOneAsync(coreSystemId)
	if (!coreSystem) throw new SofieError(404, `CoreSystem "${coreSystemId}" not found!`)

	if (!coreSystem.blueprintId) {
		// No blueprint is valid
		return {
			coreSystem,
			blueprint: undefined,
			blueprintHash: undefined,
		}
	}

	// if (!showStyleBase.blueprintConfigPresetId) throw new SofieError(500, 'ShowStyleBase is missing config preset')

	const blueprint = await Blueprints.findOneAsync({
		_id: coreSystem.blueprintId,
		blueprintType: BlueprintManifestType.SYSTEM,
	})
	if (!blueprint) throw new SofieError(404, `Blueprint "${coreSystem.blueprintId}" not found!`)

	if (!blueprint.blueprintHash) throw new SofieError(500, 'Blueprint is not valid')

	const blueprintManifest = evalBlueprint(blueprint) as SystemBlueprintManifest

	return {
		coreSystem,
		blueprint,
		blueprintManifest,
	}
}

function generateDefaultSystemConfig(): BlueprintResultApplySystemConfig {
	return {
		settings: {
			cron: {
				casparCGRestart: {
					enabled: true,
				},
				storeRundownSnapshots: {
					enabled: false,
				},
			},
			support: {
				message: '',
			},
			evaluationsMessage: {
				enabled: false,
				heading: '',
				message: '',
			},
			maximumDataAge: DEFAULT_MAXIMUM_DATA_AGE,
			confirmKeyCode: DEFAULT_CONFIRM_KEY_CODE,
			poisonKey: DEFAULT_POISON_KEY,
		},
		triggeredActions: Object.values<IBlueprintTriggeredActions>(DEFAULT_CORE_TRIGGERS),
	}
}
