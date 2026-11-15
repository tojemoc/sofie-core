/**
 * This file is the entry-point for Meteor's server side
 */

// Setup logging

// App imports
import * as fs from 'fs/promises'

import { setupPrometheusMetrics } from '@sofie-automation/corelib/dist/prometheus'
import { stringifyError } from '@sofie-automation/shared-lib/dist/lib/stringifyError'

import { startBlueprintConfigPresetObservers } from './api/blueprintConfigPresets'
import { startDeviceTriggersObserver } from './api/deviceTriggers/observer'
import { createMeteorTriggersContext } from './api/deviceTriggers/triggersContext'
import { startExternalMessageQueueStatusMonitor } from './api/ExternalMessageQueue'
import { startMediaObjectDurationMonitor } from './api/ingest/rundownInput'
import { makeMeteorCallForRegistry } from './api/meteorCall'
import { bindRestApiRouter } from './api/rest/api'
import { createKoaApp } from './api/rest/koa'
import { bindServiceMessagesRouter } from './api/serviceMessages/api'
import { startStudioMappingsHashObserver } from './api/studio/api'
import { createIndexes } from './api/system'
import { startRundownVersionHashObservers } from './collections'
import { connectMongo } from './collections/mongoConnection'
import { markAllPeripheralDevicesOffline } from './Connections'
import {
	getSystemStorePath,
	initializeCoreSystem,
	RelevantSystemVersions,
	setupSystemStatusObservers,
	startApmInstrumenting,
	updateLoggerLevel,
} from './coreSystem'
import { startCronjobs } from './cronjobs'
import { createDdpConnectionRegistry, startStandaloneDdpServer } from './ddp-server'
import { createHttpServer, listenHttpServer } from './httpServer'
import { describeRunMode, isInDevelopmentMode, isInTestMode } from './lib'
import { logger } from './logging'
import { bindLogoRouter } from './logo'
import { registerAllApiMethods } from './methodRegistrations'
import { MethodRegistry } from './methodRegistry'
import { CURRENT_SYSTEM_VERSION } from './migration/currentSystemVersion'
import { startPerformanceMonitor } from './performanceMonitor'
import { registerAllPublications } from './publicationRegistrations'
import { PublicationRegistry } from './publicationRegistry'
import { startupVerifyAllMethods } from './security/securityVerify'
import { bindSystemStatusRouter } from './systemStatus/api'
import { startTimeJumpDetector } from './systemTime'
import { bindWebManifestRouter } from './webmanifest'
import { startJobWorkerParent } from './worker/worker'
// Register all migration steps
import './migration/migrations'

import { USER_PERMISSIONS_HEADER } from './security/auth'

console.log('startup')

// Build and populate the method registry
const methodRegistry = new MethodRegistry()
registerAllApiMethods(methodRegistry)

// Build and populate the publication registry
const publicationRegistry = new PublicationRegistry()
registerAllPublications(publicationRegistry)

// The registry of live DDP sessions, shared between the DDP server and the performance monitor
const ddpConnectionRegistry = createDdpConnectionRegistry()

;(async () => {
	console.log('process started') // This is a message all Sofie processes log upon startup

	logger.info(`Core starting up`)
	logger.info(`Core system version: "${CURRENT_SYSTEM_VERSION}"`)
	logger.info(`Core running in ${describeRunMode()}`)

	if (global.gc) {
		logger.info(`Manual garbage-collection is enabled`)
	} else {
		logger.warn(
			`Enable garbage-collection by passing --expose_gc to node in prod or set SERVER_NODE_OPTIONS=--expose_gc in dev`
		)
	}

	if (!isInTestMode()) {
		// Ensure the storepath exists
		const storePath = getSystemStorePath()
		logger.info(`Using storePath: ${storePath}`)
		await fs.mkdir(storePath, { recursive: true })
	}

	const versions = await RelevantSystemVersions
	for (const [name, version] of Object.entries<string>(versions)) {
		logger.info(`Core package ${name} version: "${version}"`)
	}

	// Setup MongoDB connection
	await connectMongo()
	createIndexes() // Ensure indexes are created on startup:

	await markAllPeripheralDevicesOffline()
	const startupCoreSystem = await initializeCoreSystem() // Ensure the core system is initialized
	updateLoggerLevel(startupCoreSystem, true)
	startApmInstrumenting(startupCoreSystem)

	bindRestApiRouter(methodRegistry, publicationRegistry)
	bindLogoRouter()
	bindWebManifestRouter()
	bindServiceMessagesRouter()
	bindSystemStatusRouter()

	await startJobWorkerParent()

	if (isInDevelopmentMode()) startupVerifyAllMethods(methodRegistry)

	setupPrometheusMetrics('meteor')

	// Start observing studios for device triggers, dispatching their actions through the method registry
	const meteorCallForTriggers = makeMeteorCallForRegistry(methodRegistry, () => ({
		connection: {
			// This is a workaround for triggering actions using input-gateway,
			// where the connection-context isn't provided to the triggerContext,
			// since the trigger action does MeteorCall server-side.
			// This context passes the auth.
			// Long term, this should be replaced with some non-meteor connection-context.
			id: 'fakeConnectionId',
			signal: new AbortController().signal, // noop signal for tests
			close: () => {
				throw new Error('Not implemented')
			},
			onClose: () => {
				throw new Error('Not implemented')
			},
			clientAddress: '127.0.0.1',
			httpHeaders: {
				// Allow all studio actions
				[USER_PERMISSIONS_HEADER]: 'studio',
			},
		},
		unblock: () => undefined,
	}))
	await startDeviceTriggersObserver((getCache) => createMeteorTriggersContext(meteorCallForTriggers, getCache))
	await Promise.all([
		setupSystemStatusObservers(),
		startMediaObjectDurationMonitor(),
		startStudioMappingsHashObserver(),
		startRundownVersionHashObservers(),
		startBlueprintConfigPresetObservers(),
		startExternalMessageQueueStatusMonitor(),
	])

	startCronjobs()
	startPerformanceMonitor(ddpConnectionRegistry)

	// Build the http server and everything mounted on it, then start listening once it is all attached
	const httpServer = createHttpServer(createKoaApp())
	startStandaloneDdpServer(methodRegistry, publicationRegistry, ddpConnectionRegistry, httpServer)
	await listenHttpServer(httpServer)

	// Ensure all the publications were registered at startup
	if (isInDevelopmentMode()) publicationRegistry.verifyAllPublicationsRegistered()

	startTimeJumpDetector()
})().catch((e) => {
	logger.error(`Startup failed: ${stringifyError(e)}`)

	// eslint-disable-next-line n/no-process-exit
	process.exit(1)
})
