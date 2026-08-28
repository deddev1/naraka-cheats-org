#!/usr/bin/env node
/**
 * Fail when indexable HTML references images over MAX_BYTES.
 * Run after `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const imagesDir = path.join(__dirname, '..', 'public', 'images');
const MAX_BYTES = 100 * 1024;

function walkHtml(dir, files = []) {
	if (!fs.existsSync(dir)) return files;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkHtml(full, files);
		else if (entry.name.endsWith('.html')) files.push(full);
	}
	return files;
}

function collectImageRefs(html) {
	const refs = new Set();
	const patterns = [
		/(?:src|href|content)=["'](\/images\/[^"']+)["']/gi,
		/(?:imagesrcset|srcset)=["']([^"']+)["']/gi,
		/https:\/\/narakacheats\.org(\/images\/[^"'\s,]+)/gi,
	];
	for (const re of patterns) {
		for (const m of html.matchAll(re)) {
			const chunk = m[1];
			for (const part of chunk.split(',')) {
				const url = part.trim().split(/\s+/)[0];
				const local = url.startsWith('http')
					? url.replace(/^https:\/\/narakacheats\.org/, '')
					: url;
				if (local.startsWith('/images/')) refs.add(local);
			}
		}
	}
	return refs;
}

function main() {
	if (!fs.existsSync(distDir)) {
		console.error('dist/ not found — run npm run build first');
		process.exit(1);
	}

	const large = [];
	let indexable = 0;
	const checked = new Set();

	for (const file of walkHtml(distDir)) {
		const html = fs.readFileSync(file, 'utf8');
		if (/noindex/i.test(html)) continue;
		indexable++;
		for (const ref of collectImageRefs(html)) {
			if (checked.has(ref)) continue;
			checked.add(ref);
			const disk = path.join(imagesDir, path.basename(ref));
			if (!fs.existsSync(disk)) continue;
			const bytes = fs.statSync(disk).size;
			if (bytes > MAX_BYTES) large.push({ ref, bytes });
		}
	}

	large.sort((a, b) => b.bytes - a.bytes);

	console.log('=== Image Size Audit (dist/) ===');
	console.log(`Indexable pages: ${indexable}`);
	console.log(`Unique /images/ refs checked: ${checked.size}`);
	console.log(`Images over ${MAX_BYTES / 1024}KB: ${large.length}`);

	for (const row of large.slice(0, 25)) {
		console.log(`  [${Math.round(row.bytes / 1024)}KB] ${row.ref}`);
	}
	if (large.length > 25) console.log(`  ... +${large.length - 25} more`);

	if (large.length > 0) {
		console.error(`\nImage size audit FAILED (${large.length} large images).`);
		process.exit(1);
	}

	console.log('\nImage size audit PASSED.');
}

main();
