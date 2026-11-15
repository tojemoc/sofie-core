import ClassNames from 'classnames'

import type { DBRundown } from '@sofie-automation/corelib/dist/dataModel/Rundown'
import type { DBRundownPlaylist } from '@sofie-automation/corelib/dist/dataModel/RundownPlaylist/RundownPlaylist'
import type {
	DashboardLayoutPlaylistName,
	RundownLayoutBase,
	RundownLayoutPlaylistName,
} from '@sofie-automation/meteor-lib/dist/collections/RundownLayouts'

import { Rundowns } from '../../collections/index.js'
import { useTracker } from '../../lib/ReactMeteorData/ReactMeteorData.js'
import { RundownLayoutsAPI } from '../../lib/rundownLayouts.js'
import { dashboardElementStyle } from './DashboardPanel.js'

interface IPlaylistNamePanelProps {
	layout: RundownLayoutBase
	panel: RundownLayoutPlaylistName
	playlist: DBRundownPlaylist
}

export function PlaylistNamePanel({ panel, layout, playlist }: IPlaylistNamePanelProps): JSX.Element {
	const isDashboardLayout = RundownLayoutsAPI.isDashboardLayout(layout)

	const currentRundownId = playlist.currentPartInfo?.rundownId
	const currentRundownName = useTracker(() => {
		if (!panel.showCurrentRundownName || !currentRundownId) return undefined
		const rundown = Rundowns.findOne(currentRundownId, { projection: { name: 1 } }) as Pick<DBRundown, 'name'>
		return rundown?.name
	}, [currentRundownId, panel.showCurrentRundownName])

	return (
		<div
			className={ClassNames(
				'playlist-name-panel',
				isDashboardLayout ? (panel as DashboardLayoutPlaylistName).customClasses : undefined
			)}
			style={isDashboardLayout ? dashboardElementStyle(panel as DashboardLayoutPlaylistName) : {}}
		>
			<div className="wrapper">
				<span className="playlist-name">{playlist.name}</span>
				{currentRundownName && <span className="rundown-name">{currentRundownName}</span>}
			</div>
		</div>
	)
}
