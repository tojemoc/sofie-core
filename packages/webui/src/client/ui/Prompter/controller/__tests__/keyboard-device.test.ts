/**
 * Integration-style tests for KeyboardController SPEED mode.
 * Uses jsdom's window + a minimal PrompterViewContent stub.
 */
jest.mock('../../PrompterView.js', () => ({
	PrompterConfigMode: { KEYBOARD: 'keyboard' },
}))

import { KeyboardController } from '../keyboard-device'
import { KEYBOARD_VELOCITY_DEFAULTS, velocityStepToSpeed } from '../keyboard-velocity'
import { PrompterConfigMode } from '../../PrompterView.js'

function makeView(controlMode?: string) {
	return {
		configOptions: {
			controlMode,
			mirror: false,
			mirrorv: false,
			followTake: true,
			joycon_invertJoystick: true,
			showMarker: true,
			showScroll: true,
			debug: true,
			showOverUnder: true,
			showPlaylistName: false,
			addBlankLine: true,
		},
		props: { t: (s: string) => s },
		findAnchorPosition: () => undefined,
		scrollToPrevious: jest.fn(),
		scrollToFollowing: jest.fn(),
		scrollToLive: jest.fn(),
		scrollToNext: jest.fn(),
		DEBUG_controllerSpeed: jest.fn(),
		DEBUG_controllerState: jest.fn(),
	} as any
}

function keyDown(controller: KeyboardController, code: string, opts: Partial<KeyboardEvent> = {}) {
	const e = {
		code,
		key: code,
		preventDefault: jest.fn(),
		repeat: false,
		ctrlKey: false,
		...opts,
	} as unknown as KeyboardEvent
	controller.onKeyDown(e)
	return e
}

function keyUp(controller: KeyboardController, code: string) {
	const e = {
		code,
		key: code,
		preventDefault: jest.fn(),
		repeat: false,
		ctrlKey: false,
	} as unknown as KeyboardEvent
	controller.onKeyUp(e)
	return e
}

describe('KeyboardController SPEED mode', () => {
	let scrollY: number
	let scrollByMock: jest.Mock
	let rafCallbacks: FrameRequestCallback[]

	beforeEach(() => {
		localStorage.clear()
		scrollY = 100
		rafCallbacks = []
		scrollByMock = jest.fn(({ top }: { top: number }) => {
			scrollY += top
		})
		Object.defineProperty(window, 'scrollY', {
			configurable: true,
			get: () => scrollY,
		})
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			get: () => 800,
		})
		Object.defineProperty(document.documentElement, 'scrollHeight', {
			configurable: true,
			get: () => 10000,
		})
		window.scrollBy = scrollByMock as any
		window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
			rafCallbacks.push(cb)
			return rafCallbacks.length
		}) as any
	})

	function flushFrames(n = 5) {
		for (let i = 0; i < n; i++) {
			const cbs = rafCallbacks.splice(0, rafCallbacks.length)
			for (const cb of cbs) cb(performance.now())
		}
	}

	it('ramps speed with repeated Arrow Down taps (QPrompt-style)', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)

		keyDown(controller, 'ArrowDown') // 0 -> 1
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalled()
		const speed1 = velocityStepToSpeed(1)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(speed1)

		keyDown(controller, 'ArrowDown') // 1 -> 2
		flushFrames(2)
		const speed2 = velocityStepToSpeed(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(speed2)

		keyDown(controller, 'ArrowDown') // 2 -> 3
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(3))

		controller.destroy()
	})

	it('Arrow Up reverses / decreases velocity', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)

		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown') // step 3
		keyDown(controller, 'ArrowUp') // step 2
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(2))

		controller.destroy()
	})

	it('Space pauses and resumes at the same speed', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)

		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown') // step 3
		flushFrames(2)
		scrollByMock.mockClear()

		keyDown(controller, 'Space') // pause
		flushFrames(3)
		const callsAfterPause = scrollByMock.mock.calls.length

		keyDown(controller, 'Space') // resume
		flushFrames(3)
		expect(scrollByMock.mock.calls.length).toBeGreaterThan(callsAfterPause)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(3))

		controller.destroy()
	})

	it('R hold winds reverse fast and restores prior velocity on release', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)

		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown') // step 3
		flushFrames(1)

		keyDown(controller, 'KeyR')
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(
			velocityStepToSpeed(-KEYBOARD_VELOCITY_DEFAULTS.fastStep)
		)

		keyUp(controller, 'KeyR')
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(3))

		controller.destroy()
	})

	it('F hold winds forward fast and restores prior velocity on release', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)

		keyDown(controller, 'ArrowDown')
		flushFrames(1)

		keyDown(controller, 'KeyF')
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(
			velocityStepToSpeed(KEYBOARD_VELOCITY_DEFAULTS.fastStep)
		)

		keyUp(controller, 'KeyF')
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(1))

		controller.destroy()
	})

	it('remembers velocity across controller instances via localStorage', () => {
		const view1 = makeView('speed')
		const c1 = new KeyboardController(view1)
		keyDown(c1, 'ArrowDown')
		keyDown(c1, 'ArrowDown')
		keyDown(c1, 'ArrowDown')
		keyDown(c1, 'ArrowDown') // step 4
		flushFrames(1)
		c1.destroy()

		expect(localStorage.getItem('prompter-controller-keyboard-velocity')).toBe('4')

		const view2 = makeView('speed')
		const c2 = new KeyboardController(view2)
		// Starts paused at remembered speed; Space resumes
		keyDown(c2, 'Space')
		flushFrames(2)
		expect(view2.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(4))
		c2.destroy()
	})

	it('reports KEYBOARD as debug source', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)
		keyDown(controller, 'ArrowDown')
		expect(view.DEBUG_controllerState).toHaveBeenCalledWith(
			expect.objectContaining({
				source: PrompterConfigMode.KEYBOARD,
				lastEvent: 'keyDown: ArrowDown',
			})
		)
		controller.destroy()
	})

	it('ignores key repeat for arrow dials', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)
		keyDown(controller, 'ArrowDown') // step 1
		keyDown(controller, 'ArrowDown', { repeat: true }) // ignored
		flushFrames(2)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(1))
		controller.destroy()
	})

	it('at top edge, ArrowUp stops continuing past but ArrowDown can still slow/reverse', () => {
		scrollY = 0
		const view = makeView('speed')
		const controller = new KeyboardController(view)

		// Build up positive speed, then sit at top
		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown') // step 3
		flushFrames(3)
		scrollY = 0
		view.DEBUG_controllerSpeed.mockClear()

		// Opposite direction at top: slow 3 → 2 (must not zero just because atTop)
		keyDown(controller, 'ArrowUp')
		flushFrames(3)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(2))

		view.DEBUG_controllerSpeed.mockClear()
		// From step 2, dial through 1, 0, then past-edge attempt (-1) → stop at 0
		keyDown(controller, 'ArrowUp') // 1
		keyDown(controller, 'ArrowUp') // 0
		flushFrames(3)
		keyDown(controller, 'ArrowUp') // would be -1 at top → clamp to 0
		flushFrames(3)
		expect(view.DEBUG_controllerSpeed).toHaveBeenCalledWith(0)

		controller.destroy()
	})

	it('does not persist R/F fastStep; destroy mid-wind restores backup', () => {
		const view = makeView('speed')
		const controller = new KeyboardController(view)

		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown')
		keyDown(controller, 'ArrowDown') // step 3
		flushFrames(1)
		expect(localStorage.getItem('prompter-controller-keyboard-velocity')).toBe('3')

		keyDown(controller, 'KeyF')
		flushFrames(2)
		// Wind speed must not overwrite remembered dialed speed
		expect(localStorage.getItem('prompter-controller-keyboard-velocity')).toBe('3')

		controller.destroy()
		expect(localStorage.getItem('prompter-controller-keyboard-velocity')).toBe('3')

		const view2 = makeView('speed')
		const c2 = new KeyboardController(view2)
		keyDown(c2, 'Space')
		flushFrames(2)
		expect(view2.DEBUG_controllerSpeed).toHaveBeenCalledWith(velocityStepToSpeed(3))
		c2.destroy()
	})

	it('survives localStorage SecurityError on construct and persist', () => {
		const boom = () => {
			throw new DOMException('blocked', 'SecurityError')
		}
		const getSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
		const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)

		expect(() => new KeyboardController(makeView('speed'))).not.toThrow()
		const controller = new KeyboardController(makeView('speed'))
		expect(() => keyDown(controller, 'ArrowDown')).not.toThrow()
		flushFrames(1)
		controller.destroy()

		getSpy.mockRestore()
		setSpy.mockRestore()
	})
})
