import classNames from 'classnames'
import Moment from 'react-moment'

import { useTiming } from './withTiming.js'

export function TimeOfDay({ className }: Readonly<{ className?: string }>): JSX.Element {
	const timingDurations = useTiming()

	return (
		<span className={classNames('timing-clock time-now', className)}>
			<span className="countdown__value">
				<Moment interval={0} format="HH:mm:ss" date={timingDurations.currentTime || 0} />
			</span>
		</span>
	)
}
