import * as React from 'react'
import type { ReadonlyDeep } from 'type-fest'

import { SourceLayerType } from '@sofie-automation/blueprints-integration'
import type { IOutputLayer, ISourceLayer } from '@sofie-automation/blueprints-integration'
import type { PieceStatusCode } from '@sofie-automation/corelib/dist/dataModel/Piece'
import type { PieceContentStatusObj } from '@sofie-automation/corelib/dist/dataModel/PieceContentStatus'
import type { ITranslatableMessage } from '@sofie-automation/corelib/dist/TranslatableMessage'
import type { UIStudio } from '@sofie-automation/corelib/src/dataModel/Studio.js'

import { DefaultListItemRenderer } from './DefaultListItemRenderer.js'
import { L3rdListItemRenderer } from './L3rdListItemRenderer.js'
import { VTListItemRenderer } from './VTListItemRenderer.js'
import type { IAdLibListItem } from '../AdLibListItem.js'

export interface ILayerItemRendererProps {
	adLibListItem: IAdLibListItem
	contentStatus: ReadonlyDeep<PieceContentStatusObj> | undefined
	selected: boolean
	layer: ISourceLayer | undefined
	outputLayer: IOutputLayer | undefined
	status?: PieceStatusCode | null
	messages?: ReadonlyDeep<ITranslatableMessage[]> | null
	studio: UIStudio | undefined
}

export default function renderItem(props: ILayerItemRendererProps): JSX.Element {
	const { layer } = props
	switch (layer?.type) {
		case SourceLayerType.LIVE_SPEAK:
		case SourceLayerType.VT:
			return React.createElement(VTListItemRenderer, props)
		case SourceLayerType.GRAPHICS:
		case SourceLayerType.LOWER_THIRD:
		case SourceLayerType.STUDIO_SCREEN:
			return React.createElement(L3rdListItemRenderer, props)
	}

	return React.createElement(DefaultListItemRenderer, props)
}
