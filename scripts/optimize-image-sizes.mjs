#!/usr/bin/env node
/**
 * Recompress site images and regenerate responsive variants.
 * Targets ≤100KB per asset referenced in HTML (Screaming Frog large-image threshold).
 */
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const imagesDir = path.resolve('public/images');
const MAX_BYTES = 100 * 1024;
const CONTENT_WIDTHS = [480, 960];

const SKIP = [/-\d+w\.webp$/i, /favicon/i, /logo-mark/i];

function isSkippable(file) {
	return SKIP.some((re) => re.test(file));
}

function baseName(file) {
	return file.replace(/\.webp$/i, '');
}

async function encodeWebp(input, width, quality) {
	const meta = await sharp(input).metadata();
	const nativeWidth = meta.width ?? width;
	const targetWidth = Math.min(width, nativeWidth);
	const height = Math.round(((meta.height ?? 595) / nativeWidth) * targetWidth);
	return sharp(input)
		.resize(targetWidth, height, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality, effort: 6, smartSubsample: true })
		.toBuffer();
}

async function writeIfSmaller(dest, buffer) {
	const prev = await stat(dest).catch(() => null);
	if (!prev || buffer.length < prev.size) {
		await writeFile(dest, buffer);
	}
	return buffer.length;
}

async function optimizeWebpCanonical(file) {
	const source = path.join(imagesDir, file);
	const name = baseName(file);
	const isScreenshot = /^naraka-screenshot-\d{2}$/i.test(name);
	const isReviews = name === 'reviews-banner';
	const isModule = /^naraka-cheats-/i.test(name) && !name.includes('hero');
	const maxCanonicalWidth = isScreenshot || isReviews || isModule ? 960 : undefined;

	let pipeline = sharp(source);
	const meta = await pipeline.metadata();
	if (maxCanonicalWidth && (meta.width ?? 0) > maxCanonicalWidth) {
		pipeline = pipeline.resize({ width: maxCanonicalWidth, withoutEnlargement: true });
	}

	const quality = isScreenshot ? 70 : isModule ? 72 : 74;
	let buffer = await pipeline.webp({ quality, effort: 6, smartSubsample: true }).toBuffer();

	// Step down quality until under threshold (screenshots only).
	if (buffer.length > MAX_BYTES && (isScreenshot || isReviews || isModule)) {
		for (const q of [66, 62, 58, 54]) {
			buffer = await sharp(source)
				.resize({
					width: maxCanonicalWidth ?? meta.width,
					withoutEnlargement: true,
				})
				.webp({ quality: q, effort: 6, smartSubsample: true })
				.toBuffer();
			if (buffer.length <= MAX_BYTES) break;
		}
	}

	const bytes = await writeIfSmaller(source, buffer);
	const results = [{ file, bytes, role: 'canonical' }];

	if (isScreenshot || isReviews || isModule) {
		for (const width of CONTENT_WIDTHS) {
			const variant = `${name}-${width}w.webp`;
			const q = width <= 480 ? 64 : 68;
			const variantBuf = await encodeWebp(source, width, q);
			const variantBytes = await writeIfSmaller(path.join(imagesDir, variant), variantBuf);
			results.push({ file: variant, bytes: variantBytes, role: `${width}w` });
		}
	}

	return results;
}

async function optimizeLogoPng() {
	const logoPng = path.join(imagesDir, 'naraka-cheats-logo.png');
	const logoWebp = path.join(imagesDir, 'naraka-cheats-logo.webp');
	const pngBuf = await sharp(logoPng)
		.png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
		.toBuffer();
	const pngBytes = await writeIfSmaller(logoPng, pngBuf);
	const webpBuf = await sharp(logoPng).webp({ quality: 82, effort: 6 }).toBuffer();
	const webpBytes = await writeIfSmaller(logoWebp, webpBuf);
	return [
		{ file: 'naraka-cheats-logo.png', bytes: pngBytes },
		{ file: 'naraka-cheats-logo.webp', bytes: webpBytes },
	];
}

async function optimizeHeroVariants() {
	const heroWidths = [
		{ file: 'naraka-cheats-hero-480w.webp', width: 480, quality: 56 },
		{ file: 'naraka-cheats-hero-640w.webp', width: 640, quality: 66 },
		{ file: 'naraka-cheats-hero-1024w.webp', width: 1024, quality: 72 },
		{ file: 'naraka-cheats-hero-1199w.webp', width: 1199, quality: 74 },
	];
	const source = path.join(imagesDir, 'naraka-cheats-hero.webp');
	const results = [];
	for (const { file, width, quality } of heroWidths) {
		const buf = await encodeWebp(source, width, quality);
		const bytes = await writeIfSmaller(path.join(imagesDir, file), buf);
		results.push({ file, bytes });
	}
	return results;
}

const files = (await readdir(imagesDir)).filter((f) => f.endsWith('.webp') && !isSkippable(f));
const allResults = [];

for (const file of files.sort()) {
	if (file.startsWith('naraka-cheats-hero-')) continue;
	allResults.push(...(await optimizeWebpCanonical(file)));
}

allResults.push(...(await optimizeHeroVariants()));
allResults.push(...(await optimizeLogoPng()));

const over = allResults.filter((r) => r.bytes > MAX_BYTES);
console.log(`Optimized ${allResults.length} image file(s).`);
for (const row of allResults.sort((a, b) => b.bytes - a.bytes).slice(0, 20)) {
	console.log(`  ${Math.round(row.bytes / 1024)}KB  ${row.file}${row.role ? ` (${row.role})` : ''}`);
}
if (over.length) {
	console.warn(`\nWarning: ${over.length} file(s) still over ${MAX_BYTES / 1024}KB:`);
	for (const row of over) console.warn(`  ${Math.round(row.bytes / 1024)}KB  ${row.file}`);
	process.exit(1);
}
console.log('\nAll optimized assets are within the size budget.');
