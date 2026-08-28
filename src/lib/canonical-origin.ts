/** Canonical public origin — must match src/data/brand.ts url. */
export const CANONICAL_ORIGIN = 'https://narakacheats.org';
export const CANONICAL_HOST = 'narakacheats.org';

/** Legacy hosts that 301 to the canonical apex (see worker.ts LEGACY_HOSTS). */
export const LEGACY_HOSTS = [
	'valoranthacks.org',
	'www.valoranthacks.org',
	'valorantcheats.org',
	'www.valorantcheats.org',
	'rustcheats.co',
	'www.rustcheats.co',
	'bestrustcheats.com',
	'www.bestrustcheats.com',
	'rustcheat.co',
	'www.rustcheat.co',
	'theislehacks.org',
	'www.theislehacks.org',
	'bestislecheats.com',
	'www.bestislecheats.com',
	'theislehack.org',
	'www.theislehack.org',
	'thefinalscheats.org',
	'www.thefinalscheats.org',
] as const;

/** Regex-safe legacy origins for sitemap XML rewrite (http + https, apex + www). */
const LEGACY_ORIGIN_PATTERN = new RegExp(
	`https?:\\/\\/(?:www\\.)?(?:${LEGACY_HOSTS.map((h) => h.replace(/^www\./, '')).filter((h, i, a) => a.indexOf(h) === i).join('|')})`,
	'gi',
);

/** Rewrite stale sitemap XML that still references a legacy apex. */
export function rewriteLegacyOriginsInSitemapXml(xml: string): string {
	return xml.replace(LEGACY_ORIGIN_PATTERN, CANONICAL_ORIGIN);
}

/** Local dev / preview hosts should not 301 to the production apex. */
export function isLocalOrPreviewHost(host: string): boolean {
	return (
		host === 'localhost' ||
		host === '127.0.0.1' ||
		host.endsWith('.workers.dev') ||
		host.endsWith('.pages.dev') ||
		host.endsWith('.trycloudflare.com')
	);
}

/** Fail CI when built sitemaps still mention a legacy host. */
export function findLegacyHostsInText(text: string): string[] {
	const found = new Set<string>();
	for (const host of LEGACY_HOSTS) {
		if (text.toLowerCase().includes(host)) found.add(host);
	}
	return [...found].sort();
}
