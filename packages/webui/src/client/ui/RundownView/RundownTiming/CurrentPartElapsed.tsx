import { unprotectString } from '@sofie-automation/shared-lib/dist/lib/protectedString'
import type { PartId } from '@sofie-automation/corelib/dist/dataModel/Ids'

import { RundownUtils } from '../../../lib/rundown.js'
import { TimingDataResolution, TimingTickResolution, useTiming } from './withTiming.js'

interface IPartElapsedProps {
	currentPartId: PartId | undefined
	className?: string
}

/**
 * A presentational component that will render the elapsed duration of the current part
 */
export function CurrentPartElapsed({ currentPartId, className }: IPartElapsedProps): JSX.Element {
	const timingDurations = useTiming(TimingTickResolution.High, TimingDataResolution.High)

	const displayTimecode =
		currentPartId && timingDurations.partPlayed
			? timingDurations.partPlayed[unprotectString(currentPartId)] || 0
			: 0

	return (
		<span className={className} role="timer">
			{RundownUtils.formatDiffToTimecodeCountdown(displayTimecode || 0)}
		</span>
	)
}
