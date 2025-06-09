import { flatRoutes } from "@react-router/fs-routes";
import { route, type RouteConfig } from "@react-router/dev/routes";

export default [
	route('sign-in/*', 'routes/sign-in.tsx'),
	route('sign-up/*', 'routes/sign-up.tsx'),
  
	...(await flatRoutes(
		{
		ignoredRouteFiles: [
			'.*',
			'**/*.css',
			'**/*.test.{js,jsx,ts,tsx}',
			'**/__*.*',
			"routes/sign-in.tsx",
			"routes/sign-up.tsx",
			// This is for server-side utilities you want to colocate
			// next to your routes without making an additional
			// directory. If you need a route that includes "server" or
			// "client" in the filename, use the escape brackets like:
			// my-route.[server].tsx
			'**/*.server.*',
			'**/*.client.*',
		],
			}
		)
		),
] satisfies RouteConfig;

