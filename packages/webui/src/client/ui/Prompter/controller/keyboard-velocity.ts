/**
 * QPrompt-style velocity helpers for the Sofie prompter keyboard controller.
 *
 * Speed (px per frame @ ~60fps) = baseSpeed * |step| ^ curvature
 * Matches QPrompt defaults: baseSpeed=1.0, curvature=1.15, default step=3, fast step=35.
 */

export const KEYBOARD_VELOCITY_DEFAULTS = {
	baseSpeed: 1.0,
	curvature: 1.15,
	/** Suggested step used when resuming after a full stop with no prior memory */
	defaultStep: 3,
	/** Absolute velocity step used while holding R / F */
	fastStep: 35,
	/** Max |step| (QPrompt velocity slider tops out at 20) */
	maxStep: 20,
} as const

/** Pixels-per-frame scroll speed for a discrete velocity step. */
export function velocityStepToSpeed(
	step: number,
	baseSpeed: number = KEYBOARD_VELOCITY_DEFAULTS.baseSpeed,
	curvature: number = KEYBOARD_VELOCITY_DEFAULTS.curvature
): number {
	if (step === 0) return 0
	const magnitude = baseSpeed * Math.pow(Math.abs(step), curvature)
	return Math.sign(step) * magnitude
}

/**
 * Apply one QPrompt-style velocity dial tap.
 *
 * When paused (`playing === false`), the first tap resumes at the current step
 * without changing it. When already playing, the step moves by `direction`.
 * Matches QPrompt's increaseVelocity / decreaseVelocity.
 */
export function dialVelocityStep(
	currentStep: number,
	playing: boolean,
	direction: 1 | -1,
	maxStep: number = KEYBOARD_VELOCITY_DEFAULTS.maxStep
): { step: number; playing: true } {
	let step = currentStep
	if (playing) {
		step = currentStep + direction
	}
	step = Math.max(-maxStep, Math.min(maxStep, step))
	return { step, playing: true }
}

/** Persistable "remembered reading speed": last non-zero step (signed). */
export function rememberVelocityStep(step: number, previousRemembered: number): number {
	return step !== 0 ? step : previousRemembered
}
