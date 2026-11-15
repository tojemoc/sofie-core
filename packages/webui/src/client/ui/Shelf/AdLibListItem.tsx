import { ContextMenuTrigger } from '@jstarpl/react-contextmenu'
import ClassNames from 'classnames'

import { unprotectString } from '@sofie-automation/shared-lib/dist/lib/protectedString'
import type { IBlueprintActionTriggerMode, ISourceLayer } from '@sofie-automation/blueprints-integration'
import type { UIStudio } from '@sofie-automation/corelib/src/dataModel/Studio.js'
import type { IAdLibListItem } from '@sofie-automation/meteor-lib/dist/uiTypes/Adlib'

import { contextMenuHoldToDisplayTime } from '../../lib/lib.js'
import { useContentStatusForAdlibPiece } from '../SegmentTimeline/withMediaObjectStatus.js'
import renderItem from './Renderers/ItemRendererFactory.js'
import { ContextType as MenuContextType, setShelfContextMenuContext } from './ShelfContextMenu.js'

export type { IAdLibListItem } from '@sofie-automation/meteor-lib/dist/uiTypes/Adlib'

interface IListViewItemProps {
	piece: IAdLibListItem
	studio: UIStudio
	layer: ISourceLayer | undefined
	selected: boolean
	disabled?: boolean
	onSelectAdLib?: (aSLine: IAdLibListItem) => void
	onToggleAdLib?: (aSLine: IAdLibListItem, queue: boolean, context: any, mode?: IBlueprintActionTriggerMode) => void
}

export function AdLibListItem({
	piece,
	studio,
	layer,
	selected,
	disabled,
	onSelectAdLib,
	onToggleAdLib,
}: IListViewItemProps): JSX.Element {
	const contentStatus = useContentStatusForAdlibPiece(piece)

	return (
		<ContextMenuTrigger
			id="shelf-context-menu"
			attributes={{
				className: ClassNames('adlib-panel__list-view__list__segment__item', {
					selected: selected,
					invalid: piece.invalid,
					floated: piece.floated,
					disabled: disabled,
				}),
				//@ts-expect-error React.HTMLAttributes does not list data attributes, but that's fine
				'data-obj-id': piece._id,
				onClick: () => onSelectAdLib?.(piece),
				onContextMenu: () => onSelectAdLib?.(piece),
				onDoubleClick: (e) => !disabled && onToggleAdLib?.(piece, e.shiftKey, e),
			}}
			collect={() =>
				setShelfContextMenuContext({
					type: MenuContextType.ADLIB,
					details: {
						adLib: piece,
						onToggle: !disabled ? onToggleAdLib : undefined,
						disabled: disabled,
					},
				})
			}
			holdToDisplay={contextMenuHoldToDisplayTime()}
			renderTag="tr"
			key={unprotectString(piece._id)}
		>
			{renderItem({
				adLibListItem: piece,
				contentStatus: contentStatus,
				layer: layer,
				outputLayer: piece.outputLayer,
				selected: selected,
				status: contentStatus?.status,
				messages: contentStatus?.messages,
				studio: studio,
			})}
		</ContextMenuTrigger>
	)
}
