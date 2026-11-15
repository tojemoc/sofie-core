import ClassNames from 'classnames'
import _ from 'underscore'

import type { DBPartInstance } from '@sofie-automation/corelib/dist/dataModel/PartInstance'
import type { DBRundownPlaylist } from '@sofie-automation/corelib/dist/dataModel/RundownPlaylist/RundownPlaylist'
import type { DBSegment } from '@sofie-automation/corelib/dist/dataModel/Segment'
import type {
	DashboardLayoutNextInfo,
	RundownLayoutBase,
	RundownLayoutNextInfo,
} from '@sofie-automation/meteor-lib/dist/collections/RundownLayouts'

import { Segments } from '../../collections/index.js'
import { useTracker } from '../../lib/ReactMeteorData/ReactMeteorData.js'
import { RundownLayoutsAPI } from '../../lib/rundownLayouts.js'
import { UIPartInstances } from '../Collections.js'
import { dashboardElementStyle } from './DashboardPanel.js'

interface INextInfoPanelProps {
	visible?: boolean
	layout: RundownLayoutBase
	panel: RundownLayoutNextInfo
	playlist: DBRundownPlaylist
}

export function NextInfoPanel({ visible, layout, panel, playlist }: INextInfoPanelProps): JSX.Element {
	const isDashboardLayout = RundownLayoutsAPI.isDashboardLayout(layout)

	const nextPartInstanceId = playlist.nextPartInfo?.partInstanceId
	const nextPartInstance = useTracker(
		() =>
			nextPartInstanceId &&
			(UIPartInstances.findOne(nextPartInstanceId, {
				projection: {
					segmentId: 1,
					orphaned: 1,
					part: 1,
				},
			}) as Pick<DBPartInstance, 'segmentId' | 'orphaned' | 'part'>),
		[nextPartInstanceId]
	)

	const nextSegmentId = nextPartInstance?.segmentId
	const nextSegment = useTracker(
		() =>
			nextSegmentId && (Segments.findOne(nextSegmentId, { projection: { name: 1 } }) as Pick<DBSegment, 'name'>),
		[nextSegmentId]
	)

	const showAny = !panel.hideForDynamicallyInsertedParts || nextPartInstance?.orphaned !== 'adlib-part'
	const segmentName = showAny && panel.showSegmentName && nextSegment?.name
	const partTitle = showAny && panel.showPartTitle && nextPartInstance?.part.title

	return (
		<div
			className={ClassNames(
				'next-info-panel',
				isDashboardLayout ? (panel as DashboardLayoutNextInfo).customClasses : undefined
			)}
			style={_.extend(
				isDashboardLayout ? dashboardElementStyle({ ...(panel as DashboardLayoutNextInfo), height: 1 }) : {},
				{
					visibility: visible ? 'visible' : 'hidden',
				}
			)}
		>
			<div className="dashboard__panel--font-scaled">
				<span className="next-info-panel__name">{showAny && panel.name} </span>
				{segmentName && <span className="next-info-panel__segment">{segmentName}</span>}
				{partTitle && <span className="next-info-panel__part">{partTitle}</span>}
			</div>
		</div>
	)
}
