import type { IDataStoreMethods } from './adlibActionContext.js'
import type { IExecuteTSRActionsContext, ITriggerIngestChangeContext } from './executeTsrActionContext.js'
import type { IEventContext } from './index.js'
import type { IPartAndPieceActionContext } from './partsAndPieceActionContext.js'
import type { IPlayoutActionContext } from './playoutActionContext.js'
import type { IRouteSetMethods } from './routeSetContext.js'
import type { IShowStyleUserContext } from './showStyleContext.js'

/** Context provided to the blueprint's `onExternalEvent` handler. */
export interface IExternalEventContext
	extends
		IShowStyleUserContext,
		IEventContext,
		IDataStoreMethods,
		IPartAndPieceActionContext,
		IExecuteTSRActionsContext,
		ITriggerIngestChangeContext,
		IRouteSetMethods,
		IPlayoutActionContext {}
