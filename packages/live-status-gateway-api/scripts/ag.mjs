// Replacement for the `ag` CLI removed in @asyncapi/generator v3.
// Usage: node scripts/ag.mjs <spec> <template> -o <outputDir> [-p key=value]...
import AsyncapiGenerator from '@asyncapi/generator'

const [spec, template, ...rest] = process.argv.slice(2)
const templateParams = {}
let output
for (let i = 0; i < rest.length; i++) {
	if (rest[i] === '-o') output = rest[++i]
	else if (rest[i] === '-p') {
		const [key, value] = rest[++i].split('=')
		templateParams[key] = value
	}
}

await new AsyncapiGenerator(template, output, { templateParams, forceWrite: true }).generateFromFile(spec)
