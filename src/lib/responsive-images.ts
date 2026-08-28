/**
 * Responsive image helpers — prefer compressed WebP for LCP and below-fold media.
 */

export interface ResponsiveWidth {
	src: string;
	width: number;
}

/** Build a srcset string from width-tagged image paths. */
export function buildSrcSet(widths: ResponsiveWidth[]): string {
	return widths.map(({ src, width }) => `${src} ${width}w`).join(', ');
}

/** True when the filename already ends with a responsive width tag (e.g. -1870w). */
function hasWidthSuffix(name: string): boolean {
	return /-\d+w$/i.test(name);
}

function parseWebpBase(baseSrc: string): { dir: string; name: string } | undefined {
	const match = baseSrc.match(/^(.+\/)(.+)\.webp$/i);
	if (!match || hasWidthSuffix(match[2])) return undefined;
	return { dir: match[1], name: match[2] };
}

/** Assets that ship with -480w / -960w variants for srcset. */
function hasContentVariants(name: string): boolean {
	return /^(naraka-screenshot-\d{2}|reviews-banner|naraka-cheats-)/i.test(name);
}

/** Path for a responsive width variant when it exists. */
export function contentVariantPath(baseSrc: string, width: (typeof contentWidths)[number]): string | undefined {
	const parsed = parseWebpBase(baseSrc);
	if (!parsed || !hasContentVariants(parsed.name)) return undefined;
	return `${parsed.dir}${parsed.name}-${width}w.webp`;
}

/**
 * Default `src` for content images — prefer the largest variant that matches display size.
 * Crawlers and browsers fall back to `src` when evaluating page weight.
 */
export function contentDisplaySrc(
	baseSrc: string,
	preferWidth: (typeof contentWidths)[number] = 960,
): string {
	return contentVariantPath(baseSrc, preferWidth) ?? baseSrc;
}

/** Build srcset for content images that have -480w / -960w variants. */
export function contentSrcSet(baseSrc: string): string | undefined {
	const parsed = parseWebpBase(baseSrc);
	if (!parsed || !hasContentVariants(parsed.name)) return undefined;

	return buildSrcSet(
		contentWidths.map((width) => ({
			src: `${parsed.dir}${parsed.name}-${width}w.webp`,
			width,
		})),
	);
}

/**
 * Social / schema image URL — use the 960w variant when available to stay under size budgets.
 */
export function socialImageSrc(baseSrc: string): string {
	return contentDisplaySrc(baseSrc, 960);
}

/**
 * Homepage / banner hero — wide banner (~2.37:1); LCP uses the 1199w WebP variant.
 */
export const heroResponsive: ResponsiveWidth[] = [
	{ src: '/images/naraka-cheats-hero-480w.webp', width: 480 },
	{ src: '/images/naraka-cheats-hero-640w.webp', width: 640 },
	{ src: '/images/naraka-cheats-hero-1024w.webp', width: 1024 },
	{ src: '/images/naraka-cheats-hero-1199w.webp', width: 1199 },
];

export const heroDesktopResponsive: ResponsiveWidth[] = heroResponsive;

/** Default LCP src — full native-width WebP for retina desktops. */
export const heroSrc = '/images/naraka-cheats-hero-1199w.webp';
export const heroSrcSet = buildSrcSet(heroResponsive);
export const heroSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1199px';

/** LCP preload — same compressed WebP. */
export const heroPreloadSrc = heroSrc;
export const heroMimeType = 'image/webp';

/** Intrinsic dimensions of the default LCP asset (1199w variant). */
export const heroWidth = 1199;
export const heroHeight = 506;

/** Responsive widths for below-fold content images. */
export const contentWidths = [480, 960] as const;

/** Canonical screenshot path — responsive variants use -480w / -960w suffixes. */
export { screenshotSrc } from '../data/product-images';

export const galleryFeaturedSizes = '(max-width: 560px) 100vw, (max-width: 900px) 90vw, 640px';
export const galleryTileSizes = '(max-width: 560px) 100vw, (max-width: 900px) 45vw, 320px';
export const productMainSizes = '(max-width: 900px) 100vw, 640px';
export const productThumbSizes = '160px';
