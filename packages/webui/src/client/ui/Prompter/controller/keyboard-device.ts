import { ControllerAbstract } from './lib.js'
import { type PrompterViewContent, PrompterConfigMode } from '../PrompterView.js'
import {
	KEYBOARD_VELOCITY_DEFAULTS,
	dialVelocityStep,
	rememberVelocityStep,
	velocityStepToSpeed,
} from './keyboard-velocity.js'

const LOCALSTORAGE_MODE = 'prompter-controller-arrowkeys'
const LOCALSTORAGE_VELOCITY = 'prompter-controller-keyboard-velocity'

/**
 * Keyboard control of the prompter.
 *
 * Two operating modes (selected via `?controlmode=` / localStorage):
 *
 * - **speed** (default): QPrompt-style velocity dial.
 *   - Arrow Up / Left: decrease velocity (tap repeatedly to speed up scrolling up)
 *   - Arrow Down / Right: increase velocity (tap repeatedly to speed up scrolling down)
 *   - Space: pause / resume at the current velocity
 *   - R (hold): rewind — scroll up fast, restore previous velocity on release
 *   - F (hold): fast-forward — scroll down fast, restore previous velocity on release
 *   - Page Up / Page Down: jump to previous / following segment and pause
 *   - Velocity is remembered across sessions (localStorage)
 *
 * - **normal**: legacy page-jump with inertial scrolling (previous Sofie behaviour)
 */
export class KeyboardController extends ControllerAbstract {
	private _mode: Mode = Mode.SPEED
	private _destroyed = false

	private _keyDown: { [button: string]: number } = {}

	private _prompterView: PrompterViewContent

	// --- SPEED mode (QPrompt-like) ---
	private _velocityStep = 0
	private _rememberedStep: number = KEYBOARD_VELOCITY_DEFAULTS.defaultStep
	private _playing = true
	private _winding = false
	private _windingKey: string | null = null
	private _velocityBackup = 0
	private _scrollRest = 0
	private readonly _baseSpeed: number
	private readonly _curvature: number
	private readonly _fastStep: number
	private readonly _maxStep: number

	// --- NORMAL mode (legacy page-jump) ---
	/** Scroll speed, in pixels per frame */
	private _maxSpeed = 100
	/** Scroll acceleration in pixels/frame^2 */
	private _acceleration = 5
	private _targetPosition = 0
	private _currentSpeed = 0
	private _currentPosition = 0
	private _continousScrolling = 0

	private _updateSpeedHandle: number | null = null

	constructor(view: PrompterViewContent) {
		super()

		this._prompterView = view

		this._baseSpeed = KEYBOARD_VELOCITY_DEFAULTS.baseSpeed
		this._curvature = KEYBOARD_VELOCITY_DEFAULTS.curvature
		this._fastStep = KEYBOARD_VELOCITY_DEFAULTS.fastStep
		this._maxStep = KEYBOARD_VELOCITY_DEFAULTS.maxStep

		const controlMode = view.configOptions.controlMode
		if (controlMode === Mode.NORMAL || controlMode === Mode.SPEED) {
			this._mode = controlMode
		} else {
			const recalledMode = localStorage.getItem(LOCALSTORAGE_MODE)
			this._mode = recalledMode === Mode.NORMAL ? Mode.NORMAL : Mode.SPEED
		}
		localStorage.setItem(LOCALSTORAGE_MODE, this._mode)

		const recalledVelocity = localStorage.getItem(LOCALSTORAGE_VELOCITY)
		if (recalledVelocity !== null) {
			const parsed = Number.parseInt(recalledVelocity, 10)
			if (!Number.isNaN(parsed) && parsed !== 0) {
				this._rememberedStep = Math.max(-this._maxStep, Math.min(this._maxStep, parsed))
				// Start paused at the remembered speed so the operator can Space/resume
				// or tap an arrow to start dialing from that speed.
				this._velocityStep = this._rememberedStep
				this._playing = false
			}
		}
	}
	public destroy(): void {
		this._destroyed = true
	}
	public onKeyDown(e: KeyboardEvent): void {
		// Ignore browser key-repeat for dial keys so holding an arrow doesn't runaway;
		// R/F intentionally use hold-to-wind and need the initial press only.
		if (e.repeat && !this._isWindKey(e.code)) return

		if (!this._keyDown[e.code]) this._keyDown[e.code] = Date.now()

		if (this._mode === Mode.SPEED) {
			this._onKeyDownSpeed(e)
		} else {
			this._onKeyDownNormal(e)
		}

		this._prompterView.DEBUG_controllerState({
			source: PrompterConfigMode.KEYBOARD,
			lastSpeed: this._mode === Mode.SPEED ? this._effectiveSpeed() : this._currentSpeed,
			lastEvent: 'keyDown: ' + e.code,
		})
	}
	public onKeyUp(e: KeyboardEvent): void {
		if (this._mode === Mode.SPEED) {
			this._onKeyUpSpeed(e)
		} else {
			this._onKeyUpNormal(e)
		}

		this._keyDown[e.code] = 0

		this._prompterView.DEBUG_controllerState({
			source: PrompterConfigMode.KEYBOARD,
			lastSpeed: this._mode === Mode.SPEED ? this._effectiveSpeed() : this._currentSpeed,
			lastEvent: 'keyUp: ' + e.code,
		})
	}
	public onMouseKeyDown(_e: MouseEvent): void {
		// Nothing
	}
	public onMouseKeyUp(_e: MouseEvent): void {
		// Nothing
	}
	public onWheel(_e: WheelEvent): void {
		// Nothing
	}

	private _isWindKey(code: string): boolean {
		return code === 'KeyR' || code === 'KeyF'
	}

	private _effectiveSpeed(): number {
		if (!this._playing && !this._winding) return 0
		return velocityStepToSpeed(this._velocityStep, this._baseSpeed, this._curvature)
	}

	private _persistVelocity(): void {
		this._rememberedStep = rememberVelocityStep(this._velocityStep, this._rememberedStep)
		if (this._rememberedStep !== 0) {
			localStorage.setItem(LOCALSTORAGE_VELOCITY, String(this._rememberedStep))
		}
	}

	private _startSpeedScrolling(): void {
		this._persistVelocity()
		this._updateScrollPositionSpeed()
	}

	private _onKeyDownSpeed(e: KeyboardEvent): void {
		switch (e.code) {
			case 'ArrowUp':
			case 'ArrowLeft':
				e.preventDefault()
				this._dial(-1)
				break
			case 'ArrowDown':
			case 'ArrowRight':
				e.preventDefault()
				this._dial(1)
				break
			case 'Space':
				e.preventDefault()
				if (e.ctrlKey) {
					this._stop()
				} else {
					this._pauseToggle()
				}
				break
			case 'KeyR':
				e.preventDefault()
				this._startWind(-this._fastStep, e.code)
				break
			case 'KeyF':
				e.preventDefault()
				this._startWind(this._fastStep, e.code)
				break
			case 'PageUp':
				e.preventDefault()
				this._playing = false
				this._prompterView.scrollToPrevious()
				break
			case 'PageDown':
				e.preventDefault()
				this._playing = false
				this._prompterView.scrollToFollowing()
				break
			default:
				break
		}
	}

	private _onKeyUpSpeed(e: KeyboardEvent): void {
		if (this._winding && this._windingKey === e.code && this._isWindKey(e.code)) {
			this._velocityStep = this._velocityBackup
			this._winding = false
			this._windingKey = null
			this._playing = true
			this._startSpeedScrolling()
		}
	}

	private _dial(direction: 1 | -1): void {
		if (this._winding) return
		const atTop = window.scrollY <= 0
		const atBottom =
			window.scrollY + window.innerHeight >=
			(document.documentElement?.scrollHeight ?? document.body.scrollHeight) - 2
		if (direction < 0 && atTop) {
			this._velocityStep = 0
			this._startSpeedScrolling()
			return
		}
		if (direction > 0 && atBottom) {
			this._velocityStep = 0
			this._startSpeedScrolling()
			return
		}

		const next = dialVelocityStep(this._velocityStep, this._playing, direction, this._maxStep)
		this._velocityStep = next.step
		this._playing = next.playing
		this._startSpeedScrolling()
	}

	private _pauseToggle(): void {
		if (this._winding) return
		if (this._velocityStep === 0) {
			// Nothing to pause — start at the remembered reading speed
			this._velocityStep = this._rememberedStep || KEYBOARD_VELOCITY_DEFAULTS.defaultStep
			this._playing = true
		} else {
			this._playing = !this._playing
		}
		this._startSpeedScrolling()
	}

	private _stop(): void {
		this._playing = true
		this._velocityStep = 0
		this._winding = false
		this._windingKey = null
		this._startSpeedScrolling()
	}

	private _startWind(fastStep: number, keyCode: string): void {
		if (this._winding) return
		this._velocityBackup = this._velocityStep
		this._winding = true
		this._windingKey = keyCode
		this._velocityStep = fastStep
		this._playing = true
		this._startSpeedScrolling()
	}

	private _updateScrollPositionSpeed(): void {
		if (this._destroyed) return
		if (this._updateSpeedHandle !== null) return

		const speed = this._effectiveSpeed()
		if (speed === 0) {
			this._scrollRest = 0
			this._prompterView.DEBUG_controllerSpeed(0)
			return
		}

		// Accumulate sub-pixel remainders so slow steps still move smoothly
		this._scrollRest += speed
		const pixels = Math.trunc(this._scrollRest)
		this._scrollRest -= pixels
		if (pixels === 0) {
			this._updateSpeedHandle = window.requestAnimationFrame(() => {
				this._updateSpeedHandle = null
				this._updateScrollPositionSpeed()
			})
			return
		}

		const before = window.scrollY
		window.scrollBy({ top: pixels, behavior: 'instant' })
		const after = window.scrollY

		// Hit end of document — stop (remembered speed kept for Space / arrow resume)
		if (before === after) {
			this._velocityStep = 0
			this._playing = true
			this._winding = false
			this._windingKey = null
			this._scrollRest = 0
			this._prompterView.DEBUG_controllerSpeed(0)
			return
		}

		this._prompterView.DEBUG_controllerSpeed(speed)
		this._updateSpeedHandle = window.requestAnimationFrame(() => {
			this._updateSpeedHandle = null
			this._updateScrollPositionSpeed()
		})
	}

	// --- Legacy NORMAL mode -------------------------------------------------

	private _onKeyDownNormal(e: KeyboardEvent): void {
		const scrollBy = Math.round(window.innerHeight * 0.66)
		const scrollPosition = window.scrollY
		if (scrollPosition === undefined) return

		if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'PageUp') {
			e.preventDefault()
			const newPosition = scrollPosition - scrollBy
			this._targetPosition =
				this._prompterView.findAnchorPosition(newPosition, scrollPosition - 10, -1) || newPosition
			this._continousScrolling = -1
			this._updateScrollPositionNormal()
		} else if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'Space' || e.code === 'PageDown') {
			e.preventDefault()
			const newPosition = scrollPosition + scrollBy
			this._targetPosition =
				this._prompterView.findAnchorPosition(scrollPosition + 10, newPosition, 1) || newPosition
			this._continousScrolling = 1
			this._updateScrollPositionNormal()
		}
	}

	private _onKeyUpNormal(e: KeyboardEvent): void {
		const timeSincePress = Date.now() - (this._keyDown[e.code] || 0)
		const scrollPosition = window.scrollY
		if (scrollPosition === undefined) return

		if (
			e.code === 'ArrowLeft' ||
			e.code === 'ArrowUp' ||
			e.code === 'PageUp' ||
			e.code === 'ArrowRight' ||
			e.code === 'ArrowDown' ||
			e.code === 'Space' ||
			e.code === 'PageDown'
		) {
			e.preventDefault()
			this._continousScrolling = 0
			let setNewPosition = false
			if (timeSincePress > 500) {
				setNewPosition = true
			} else {
				const dp = this._targetPosition - this._currentPosition
				if (Math.sign(this._currentSpeed) !== Math.sign(dp)) {
					setNewPosition = true
				}
			}
			if (setNewPosition) {
				const stopAcceleration = Math.sign(this._currentSpeed) * this._acceleration
				const d = this._getDistanceToStop(this._currentSpeed, stopAcceleration)
				this._targetPosition = scrollPosition + d / 4
			}
		}
	}

	private _getDistanceToStop(currentSpeed: number, stopAcceleration: number): number {
		if (!stopAcceleration) return 0
		const timeToStop = currentSpeed / stopAcceleration
		if (!timeToStop) return 0
		return (stopAcceleration * Math.pow(timeToStop, 2)) / 2 + currentSpeed * timeToStop
	}
	private _getAccelerationToStopInTime(
		currentSpeed: number,
		normalStopAcceleration: number,
		distanceLeft: number
	): number {
		const timeToStop = currentSpeed / normalStopAcceleration
		if (!timeToStop) return 0
		return (2 * (distanceLeft - currentSpeed * timeToStop)) / Math.pow(timeToStop, 2)
	}
	private _updateScrollPositionNormal() {
		if (this._destroyed) return
		if (this._updateSpeedHandle !== null) return
		this._updateSpeedHandle = null

		const scrollPosition = window.scrollY
		if (scrollPosition !== undefined) {
			this._currentPosition = scrollPosition
			const dp = this._continousScrolling
				? 99999 * this._continousScrolling
				: this._targetPosition - this._currentPosition
			if (dp !== 0) {
				const acceleration = Math.sign(dp) * this._acceleration
				const stopAcceleration = Math.sign(this._currentSpeed) * this._acceleration
				const distanceToStop = this._getDistanceToStop(this._currentSpeed, stopAcceleration)
				if (Math.abs(dp) <= Math.abs(distanceToStop)) {
					const actualStopAcceleration = this._getAccelerationToStopInTime(
						this._currentSpeed,
						stopAcceleration,
						dp
					)
					if (Math.abs(this._currentSpeed) < Math.abs(actualStopAcceleration)) {
						this._currentSpeed = 0
					} else {
						this._currentSpeed += actualStopAcceleration
					}
				} else {
					let newSpeed = this._currentSpeed + acceleration
					if (Math.abs(newSpeed) > this._maxSpeed) {
						newSpeed = Math.sign(newSpeed) * this._maxSpeed
					}
					if (newSpeed !== this._currentSpeed) {
						const dp2 = dp - this._currentSpeed
						const distanceToStop2 = this._getDistanceToStop(newSpeed, stopAcceleration)
						if (Math.abs(dp2) > Math.abs(distanceToStop2)) {
							this._currentSpeed = newSpeed
						}
					}
				}
				const speed = Math.round(this._currentSpeed)
				if (speed === 0 && Math.abs(dp) < 100) {
					window.scrollBy({ top: dp, behavior: 'instant' })
				} else {
					window.scrollBy({ top: speed, behavior: 'instant' })
				}

				const scrollPosition2 = window.scrollY

				if (scrollPosition2 !== undefined) {
					if (Math.abs(speed) > 10 && this._currentPosition === scrollPosition2) {
						this._targetPosition = scrollPosition2
						this._currentSpeed = 0
					}
					this._currentPosition = scrollPosition2
				}
				this._prompterView.DEBUG_controllerSpeed(speed)
				if (speed !== 0) {
					this._updateSpeedHandle = window.requestAnimationFrame(() => {
						this._updateSpeedHandle = null
						this._updateScrollPositionNormal()
					})
				}
			}
		}
	}
}
enum Mode {
	/** Legacy page-jump scrolling */
	NORMAL = 'normal',
	/** QPrompt-style continuous velocity dial */
	SPEED = 'speed',
}
