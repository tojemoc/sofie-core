import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

function casparcgSerializersPath(): string {
	const entry = require.resolve('casparcg-connection')
	return path.join(path.dirname(entry), 'serializers.js')
}

function serializeViaPatchedPackage(
	command: 'PLAY DECKLINK' | 'LOADBG DECKLINK',
	params: { channel: number; layer: number; device: number; format?: string }
): string {
	const serializersPath = casparcgSerializersPath()
	const commandsPath = path.join(path.dirname(serializersPath), 'commands.js')
	const script = `
		import { serializers } from ${JSON.stringify(pathToFileUrl(serializersPath))};
		import { Commands } from ${JSON.stringify(pathToFileUrl(commandsPath))};
		const command = ${JSON.stringify(command)};
		const params = ${JSON.stringify(params)};
		const key = command === 'PLAY DECKLINK' ? Commands.PlayDecklink : Commands.LoadbgDecklink;
		const result = serializers[key].map((fn) => fn(key, params)).filter((t) => t !== '').join(' ');
		process.stdout.write(result);
	`
	return execFileSync(process.execPath, ['--input-type=module', '-e', script], {
		encoding: 'utf8',
	})
}

function pathToFileUrl(filePath: string): string {
	const resolved = path.resolve(filePath)
	return 'file://' + (process.platform === 'win32' ? '/' + resolved.replace(/\\/g, '/') : resolved)
}

describe('casparcg-connection DeckLink AMCP (Yarn patch)', () => {
	it('keeps DEVICE in the patched serializers.js source', () => {
		const src = fs.readFileSync(casparcgSerializersPath(), 'utf8')
		expect(src).toContain("'DECKLINK DEVICE ' + device")
		expect(src).not.toMatch(/=> 'DECKLINK ' \+ device/)
	})

	it('PlayDecklink always includes the DEVICE keyword', () => {
		expect(
			serializeViaPatchedPackage('PLAY DECKLINK', {
				channel: 3,
				layer: 115,
				device: 1,
				format: '1080p5000',
			})
		).toBe('PLAY 3-115 DECKLINK DEVICE 1 FORMAT 1080p5000')
	})

	it('LoadbgDecklink always includes the DEVICE keyword', () => {
		expect(
			serializeViaPatchedPackage('LOADBG DECKLINK', {
				channel: 3,
				layer: 115,
				device: 1,
				format: '1080p5000',
			})
		).toBe('LOADBG 3-115 DECKLINK DEVICE 1 FORMAT 1080p5000')
	})

	it('omits FORMAT when not provided but still emits DEVICE', () => {
		expect(
			serializeViaPatchedPackage('PLAY DECKLINK', {
				channel: 1,
				layer: 10,
				device: 23,
			})
		).toBe('PLAY 1-10 DECKLINK DEVICE 23')
	})
})
