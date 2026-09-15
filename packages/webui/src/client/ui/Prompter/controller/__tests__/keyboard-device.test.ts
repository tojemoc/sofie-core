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
})
