import type { ReadonlyDeep } from 'type-fest'

import { SourceLayerType } from '@sofie-automation/blueprints-integration'
import { CorelibPubSub } from '@sofie-automation/corelib/dist/pubsub'
import { MeteorPubSub } from '@sofie-automation/meteor-lib/dist/api/pubsub'
import type { EvsContent } from '@sofie-automation/blueprints-integration'
import type { RundownPlaylistActivationId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import type { PieceGeneric } from '@sofie-automation/corelib/dist/dataModel/Piece'

import { useSubscription, useTracker } from '../../../lib/ReactMeteorData/ReactMeteorData.js'
import { AdjustLabelFit } from '../../util/AdjustLabelFit.js'
import { findPieceInstanceToShow } from './utils.js'
import type { AdjustLabelFitProps } from '../../util/AdjustLabelFit.js'
import type { IPropsHeader } from './ClockViewPieceIcon.js'

interface INamePropsHeader extends IPropsHeader {
	partName: string
	playlistActivationId: RundownPlaylistActivationId | undefined
	autowidth?: AdjustLabelFitProps
}

const supportedLayers = new Set([
	SourceLayerType.GRAPHICS,
	SourceLayerType.LIVE_SPEAK,
	SourceLayerType.VT,
	SourceLayerType.LOCAL,
])

function getLocalPieceLabel(piece: ReadonlyDeep<PieceGeneric>, autowidth?: AdjustLabelFitProps): JSX.Element | null {
	const { color } = piece.content as EvsContent
	return (
		<>
			{color && (
				<span
					style={{ color: color.startsWith('#') ? color : `#${color}` }}
					className="piece__label__colored-mark"
				>
					·
				</span>
			)}
			<AdjustLabelFit {...autowidth} label={piece.name || ''} />
		</>
	)
}

function getPieceLabel(
	piece: ReadonlyDeep<PieceGeneric>,
	type: SourceLayerType,
	autowidth?: AdjustLabelFitProps
): JSX.Element | null {
	switch (type) {
		case SourceLayerType.LOCAL:
			return getLocalPieceLabel(piece, autowidth)
		default:
			return <AdjustLabelFit {...autowidth} label={piece.name || ''} />
	}
}

export function PieceNameContainer(props: Readonly<INamePropsHeader>): JSX.Element | null {
	const { sourceLayer, pieceInstance } = useTracker(
		() => findPieceInstanceToShow(props, supportedLayers),
		[props.partInstanceId, props.showStyleBaseId],
		{
			sourceLayer: undefined,
			pieceInstance: undefined,
		}
	)

	useSubscription(CorelibPubSub.uiPieceInstances, props.rundownIds, null, props.playlistActivationId ?? null, {
		omitTimings: true,
	})

	useSubscription(MeteorPubSub.uiShowStyleBase, props.showStyleBaseId)

	if (pieceInstance && sourceLayer && supportedLayers.has(sourceLayer.type)) {
		return getPieceLabel(pieceInstance.piece, sourceLayer.type, props.autowidth)
	}
	return <AdjustLabelFit {...props.autowidth} label={props.partName || ''} />
}
