import { Meteor } from 'meteor/meteor'
import { check } from '../../lib/check'
import { MethodContext } from '../methodContext'
import { checkAccessAndGetPeripheralDevice } from '../../security/check'
import { PeripheralDeviceId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { PieceStatusCode } from '@sofie-automation/corelib/dist/dataModel/Piece'
import {
	RundownContentStatusResponse,
	RundownPieceContentStatus,
} from '@sofie-automation/shared-lib/dist/peripheralDevice/rundownContentStatus'
import { Blueprints, Parts, Pieces, Rundowns, ShowStyleBases } from '../../collections'
import { fetchStudio } from '../../publications/pieceContentStatusUI/common'
import {
	checkPieceContentStatusAndDependencies,
	PieceContentStatusPiece,
} from '../../publications/pieceContentStatusUI/checkPieceContentStatus'
import { PieceContentStatusMessageFactory } from '../../publications/pieceContentStatusUI/messageFactory'
import { interpollateTranslation, translateMessage } from '@sofie-automation/corelib/dist/TranslatableMessage'

function formatStatusReason(
	status: Awaited<ReturnType<typeof checkPieceContentStatusAndDependencies>>[0]
): string | undefined {
	if (status.status === PieceStatusCode.OK) {
		return undefined
	}

	const firstMessage = status.messages[0]
	if (!firstMessage) {
		return undefined
	}

	return translateMessage(firstMessage, interpollateTranslation)
}

export namespace RundownContentStatusIntegration {
	export async function getContentStatusForRundown(
		context: MethodContext,
		deviceId: PeripheralDeviceId,
		deviceToken: string,
		rundownExternalId: string
	): Promise<RundownContentStatusResponse> {
		check(rundownExternalId, String)

		const peripheralDevice = await checkAccessAndGetPeripheralDevice(deviceId, deviceToken, context)
		if (!peripheralDevice.studioAndConfigId) {
			throw new Meteor.Error(400, 'Device "' + peripheralDevice._id + '" has no studio')
		}

		const studioId = peripheralDevice.studioAndConfigId.studioId
		const studio = await fetchStudio(studioId)
		if (!studio) {
			throw new Meteor.Error(404, `Studio "${studioId}" not found`)
		}

		const rundown = await Rundowns.findOneAsync({
			studioId,
			externalId: rundownExternalId,
		})
		if (!rundown) {
			return {
				rundownExternalId,
				pieces: [],
			}
		}

		const showStyleBase = await ShowStyleBases.findOneAsync(rundown.showStyleBaseId)
		const blueprint = showStyleBase ? await Blueprints.findOneAsync(showStyleBase.blueprintId) : undefined
		const messageFactory = new PieceContentStatusMessageFactory(blueprint)

		const parts = await Parts.findFetchAsync({ rundownId: rundown._id })
		const partExternalIds = new Map(parts.map((part) => [part._id, part.externalId]))

		const pieceDocs = await Pieces.findFetchAsync({
			startRundownId: rundown._id,
			invalid: { $ne: true },
		})

		const pieces: RundownPieceContentStatus[] = []

		for (const pieceDoc of pieceDocs) {
			const sourceLayer = showStyleBase?.sourceLayers?.[pieceDoc.sourceLayerId]
			if (!sourceLayer) {
				continue
			}

			const statusPiece: PieceContentStatusPiece = {
				_id: pieceDoc._id,
				content: pieceDoc.content,
				expectedPackages: pieceDoc.expectedPackages,
				name: pieceDoc.name,
			}

			const [status] = await checkPieceContentStatusAndDependencies(
				studio,
				rundown._id,
				messageFactory,
				statusPiece,
				sourceLayer
			)

			pieces.push({
				pieceExternalId: pieceDoc.externalId,
				partExternalId: pieceDoc.startPartId ? partExternalIds.get(pieceDoc.startPartId) : undefined,
				statusCode: status.status,
				ready: status.status === PieceStatusCode.OK,
				reason: formatStatusReason(status),
			})
		}

		return {
			rundownExternalId,
			pieces,
		}
	}
}
