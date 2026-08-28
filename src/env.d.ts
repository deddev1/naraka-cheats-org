/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	readonly SKIP_BUILD_REDIRECTS?: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
