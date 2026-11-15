import { createMockContext, Options as MockContextOptions } from '@shopify/jest-koa-mocks'
import type KoaRouter from '@koa/router'
import type Koa from 'koa'

export async function callKoaRoute(
	router: KoaRouter,
	options: MockContextOptions<object, unknown>
): Promise<Koa.ParameterizedContext> {
	const routes = router.routes()

	const ctx = createMockContext(options)

	await routes(ctx as any, async () => null)

	return ctx
}
