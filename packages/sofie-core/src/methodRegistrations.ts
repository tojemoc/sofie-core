import { BlueprintAPIMethods } from '@sofie-automation/meteor-lib/dist/api/blueprint'
import { ClientAPIMethods } from '@sofie-automation/meteor-lib/dist/api/client'
import { ExternalMessageQueueAPIMethods } from '@sofie-automation/meteor-lib/dist/api/ExternalMessageQueue'
import { IMeteorCall } from '@sofie-automation/meteor-lib/dist/api/methods'
import { MigrationAPIMethods } from '@sofie-automation/meteor-lib/dist/api/migration'
import { MongoAPIMethods } from '@sofie-automation/meteor-lib/dist/api/mongo'
import { PlayoutAPIMethods } from '@sofie-automation/meteor-lib/dist/api/playout'
import { RundownAPIMethods } from '@sofie-automation/meteor-lib/dist/api/rundown'
import { RundownLayoutsAPIMethods } from '@sofie-automation/meteor-lib/dist/api/rundownLayouts'
import { SnapshotAPIMethods } from '@sofie-automation/meteor-lib/dist/api/shapshot'
import { ShowStylesAPIMethods } from '@sofie-automation/meteor-lib/dist/api/showStyles'
import { StudiosAPIMethods } from '@sofie-automation/meteor-lib/dist/api/studios'
import { SystemAPIMethods } from '@sofie-automation/meteor-lib/dist/api/system'
import { SystemStatusAPIMethods } from '@sofie-automation/meteor-lib/dist/api/systemStatus'
import { TriggeredActionsAPIMethods } from '@sofie-automation/meteor-lib/dist/api/triggeredActions'
import { UserAPIMethods } from '@sofie-automation/meteor-lib/dist/api/user'
import { UserActionAPIMethods } from '@sofie-automation/meteor-lib/dist/api/userActions'
import { PeripheralDeviceAPIMethods } from '@sofie-automation/shared-lib/dist/peripheralDevice/methodsAPI'

import { ServerBlueprintAPI } from './api/blueprints/api'
import { ServerClientAPIClass } from './api/client'
import { ServerExternalMessageQueueAPI } from './api/ExternalMessageQueue'
import { ingestDebugMethods } from './api/ingest/debug'
import { MongoAPIClass } from './api/mongo'
import { ServerPeripheralDeviceAPIClass } from './api/peripheralDevice'
import { ServerPlayoutAPIClass } from './api/playout/api'
import { playoutDebugMethods } from './api/playout/debug'
import { ServerRundownAPIClass } from './api/rundown'
import { ServerRundownLayoutsAPI } from './api/rundownLayouts'
import { ServerShowStylesAPI } from './api/showStyles'
import { ServerSnapshotAPI } from './api/snapshot'
import { ServerStudiosAPI } from './api/studio/api'
import { SystemAPIClass } from './api/system'
import { ServerTriggeredActionsAPI } from './api/triggeredActions'
import { ServerUserAPI } from './api/user'
import { ServerUserActionAPI } from './api/userActions'
import { AnyMethodApiRegistration, MethodApiRegistration, MethodRegistry } from './methodRegistry'
import { ServerMigrationAPI } from './migration/api'
import { ServerSystemStatusAPI } from './systemStatus/api'

/**
 * The complete set of API method registrations.
 *
 * The `satisfies` clause is the safety net: it is keyed off `IMeteorCall` — the exact interface the
 * client method wrappers are built from, ensuring everything is defined correctly.
 */
export const METHOD_REGISTRATIONS = {
	blueprint: { methods: BlueprintAPIMethods, class: ServerBlueprintAPI },
	client: { methods: ClientAPIMethods, class: ServerClientAPIClass },
	externalMessages: { methods: ExternalMessageQueueAPIMethods, class: ServerExternalMessageQueueAPI },
	migration: { methods: MigrationAPIMethods, class: ServerMigrationAPI },
	peripheralDevice: { methods: PeripheralDeviceAPIMethods, class: ServerPeripheralDeviceAPIClass },
	playout: { methods: PlayoutAPIMethods, class: ServerPlayoutAPIClass },
	rundown: { methods: RundownAPIMethods, class: ServerRundownAPIClass },
	rundownLayout: { methods: RundownLayoutsAPIMethods, class: ServerRundownLayoutsAPI },
	snapshot: { methods: SnapshotAPIMethods, class: ServerSnapshotAPI },
	showstyles: { methods: ShowStylesAPIMethods, class: ServerShowStylesAPI },
	triggeredActions: { methods: TriggeredActionsAPIMethods, class: ServerTriggeredActionsAPI },
	studio: { methods: StudiosAPIMethods, class: ServerStudiosAPI },
	systemStatus: { methods: SystemStatusAPIMethods, class: ServerSystemStatusAPI },
	user: { methods: UserAPIMethods, class: ServerUserAPI },
	userAction: { methods: UserActionAPIMethods, class: ServerUserActionAPI },
	system: { methods: SystemAPIMethods, class: SystemAPIClass },
	mongo: { methods: MongoAPIMethods, class: MongoAPIClass, secret: true },
} satisfies { [K in keyof IMeteorCall]: MethodApiRegistration<IMeteorCall[K]> }

/** Register every API method on the given registry. */
export function registerAllApiMethods(registry: MethodRegistry): void {
	for (const registration of Object.values<AnyMethodApiRegistration>(METHOD_REGISTRATIONS)) {
		registry.registerApi(registration)
	}

	// Developer-only debug methods. These are not part of `IMeteorCall`, but they must still live on
	// the registry to be usable
	registry.registerDebugMethods(playoutDebugMethods)
	registry.registerDebugMethods(ingestDebugMethods)
}
