import { ReadonlyDeep } from 'type-fest'
import { z } from 'zod'

import { PeripheralDeviceId, StudioId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { DBStudio, StudioPackageContainer } from '@sofie-automation/corelib/dist/dataModel/Studio'
import { literal } from '@sofie-automation/corelib/dist/lib'
import { MongoFieldSpecifierOnesStrict } from '@sofie-automation/corelib/dist/mongo'
import { applyAndValidateOverrides } from '@sofie-automation/corelib/dist/settings/objectWithOverrides'
import { PackageContainer } from '@sofie-automation/shared-lib/dist/package-manager/package'
import { PackageManagerPackageContainers } from '@sofie-automation/shared-lib/dist/package-manager/publications'
import {
	PeripheralDevicePubSub,
	PeripheralDevicePubSubCollectionsNames,
} from '@sofie-automation/shared-lib/dist/pubsub/peripheralDevice'

import { Studios } from '../../collections'
import { check } from '../../lib/check'
import { SetupObserversResult, setUpOptimizedObserverArray, TriggerUpdate } from '../../lib/customPublication'
import { logger } from '../../logging'
import { checkAccessAndGetPeripheralDevice } from '../../security/check'
import type { PublicationRegistry } from '../../publicationRegistry'

type StudioFields = '_id' | 'packageContainersWithOverrides'
const studioFieldSpecifier = literal<MongoFieldSpecifierOnesStrict<Pick<DBStudio, StudioFields>>>({
	_id: 1,
	packageContainersWithOverrides: 1,
})

interface PackageManagerPackageContainersArgs {
	readonly studioId: StudioId
	readonly deviceId: PeripheralDeviceId
}

type PackageManagerPackageContainersUpdateProps = Record<string, never>

type PackageManagerPackageContainersState = Record<string, never>

async function setupExpectedPackagesPublicationObservers(
	args: ReadonlyDeep<PackageManagerPackageContainersArgs>,
	triggerUpdate: TriggerUpdate<PackageManagerPackageContainersUpdateProps>
): Promise<SetupObserversResult> {
	// Set up observers:
	return [
		Studios.observeChanges(
			{
				studioId: args.studioId,
			},
			{
				added: () => triggerUpdate({}),
				changed: () => triggerUpdate({}),
				removed: () => triggerUpdate({}),
			},
			{
				projection: studioFieldSpecifier,
			}
		),
	]
}

async function manipulateExpectedPackagesPublicationData(
	args: ReadonlyDeep<PackageManagerPackageContainersArgs>,
	_state: Partial<PackageManagerPackageContainersState>,
	_updateProps: Partial<PackageManagerPackageContainersUpdateProps> | undefined
): Promise<PackageManagerPackageContainers[] | null> {
	// Prepare data for publication:

	// Future: this may want to cache on the state, but with only a single observer there feels little point

	const studio = (await Studios.findOneAsync(args.studioId, { projection: studioFieldSpecifier })) as
		Pick<DBStudio, StudioFields> | undefined

	const packageContainers: { [containerId: string]: PackageContainer } = {}
	if (studio) {
		const studioPackageContainers = applyAndValidateOverrides(studio.packageContainersWithOverrides).obj
		for (const [containerId, studioPackageContainer] of Object.entries<StudioPackageContainer>(
			studioPackageContainers
		)) {
			packageContainers[containerId] = studioPackageContainer.container
		}
	}

	return literal<PackageManagerPackageContainers[]>([
		{
			_id: args.deviceId,
			packageContainers,
		},
	])
}

export function registerPackageContainersPublications(registry: PublicationRegistry): void {
	registry.customPublish(
		PeripheralDevicePubSub.packageManagerPackageContainers,
		PeripheralDevicePubSubCollectionsNames.packageManagerPackageContainers,
		async (context, pub, deviceId: PeripheralDeviceId, token: string | undefined) => {
			check(deviceId, z.string())

			const peripheralDevice = await checkAccessAndGetPeripheralDevice(deviceId, token, context)

			const studioId = peripheralDevice.studioAndConfigId?.studioId
			if (!studioId) {
				logger.warn(`Pub.packageManagerPackageContainers: device "${peripheralDevice._id}" has no studioId`)
				return context.ready()
			}

			await setUpOptimizedObserverArray<
				PackageManagerPackageContainers,
				PackageManagerPackageContainersArgs,
				PackageManagerPackageContainersState,
				PackageManagerPackageContainersUpdateProps
			>(
				`${PeripheralDevicePubSub.packageManagerPackageContainers}_${studioId}_${deviceId}`,
				{ studioId, deviceId },
				setupExpectedPackagesPublicationObservers,
				manipulateExpectedPackagesPublicationData,
				pub,
				500 // ms, wait this time before sending an update
			)
		}
	)
}
