import {
	KEYBOARD_VELOCITY_DEFAULTS,
	dialVelocityStep,
	rememberVelocityStep,
	velocityStepToSpeed,
} from '../keyboard-velocity'

describe('keyboard-velocity', () => {
	describe('velocityStepToSpeed', () => {
		it('returns 0 for step 0', () => {
			expect(velocityStepToSpeed(0)).toBe(0)
		})

		it('matches QPrompt defaults at common steps', () => {
			const { baseSpeed, curvature } = KEYBOARD_VELOCITY_DEFAULTS
			expect(velocityStepToSpeed(1, baseSpeed, curvature)).toBeCloseTo(1, 5)
			expect(velocityStepToSpeed(3, baseSpeed, curvature)).toBeCloseTo(Math.pow(3, 1.15), 5)
			expect(velocityStepToSpeed(-3, baseSpeed, curvature)).toBeCloseTo(-Math.pow(3, 1.15), 5)
			expect(velocityStepToSpeed(35, baseSpeed, curvature)).toBeCloseTo(Math.pow(35, 1.15), 5)
		})
	})

	describe('dialVelocityStep', () => {
		it('increments when already playing (Arrow Down)', () => {
			expect(dialVelocityStep(0, true, 1)).toEqual({ step: 1, playing: true })
			expect(dialVelocityStep(3, true, 1)).toEqual({ step: 4, playing: true })
		})

		it('decrements when already playing (Arrow Up)', () => {
			expect(dialVelocityStep(3, true, -1)).toEqual({ step: 2, playing: true })
			expect(dialVelocityStep(1, true, -1)).toEqual({ step: 0, playing: true })
			expect(dialVelocityStep(0, true, -1)).toEqual({ step: -1, playing: true })
		})

		it('resumes without changing step when paused', () => {
			expect(dialVelocityStep(3, false, 1)).toEqual({ step: 3, playing: true })
			expect(dialVelocityStep(3, false, -1)).toEqual({ step: 3, playing: true })
		})

		it('clamps to maxStep', () => {
			expect(dialVelocityStep(20, true, 1, 20)).toEqual({ step: 20, playing: true })
			expect(dialVelocityStep(-20, true, -1, 20)).toEqual({ step: -20, playing: true })
		})
	})

	describe('rememberVelocityStep', () => {
		it('keeps last non-zero step', () => {
			expect(rememberVelocityStep(4, 3)).toBe(4)
			expect(rememberVelocityStep(0, 4)).toBe(4)
			expect(rememberVelocityStep(-2, 4)).toBe(-2)
		})
	})
})
