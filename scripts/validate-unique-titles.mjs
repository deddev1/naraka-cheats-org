#!/usr/bin/env node
/**
 * Fail when built HTML pages share duplicate <title> values.
 * Run after `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

function walkHtml(dir, files = []) {
	if (!fs.existsSync(dir)) return files;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkHtml(full, files);
		else if (entry.name.endsWith('.html')) files.push(full);
	}
	return files;
}

function decodeHtml(text) {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function main() {
	if (!fs.existsSync(distDir)) {
		console.error('dist/ not found — run npm run build first');
		process.exit(1);
	}

	const titles = new Map();
	let indexable = 0;
	let noindex = 0;

	for (const file of walkHtml(distDir)) {
		const rel = path.relative(distDir, file).replace(/\\/g, '/');
		const html = fs.readFileSync(file, 'utf8');
		const isNoindex = /noindex/i.test(html);
		if (isNoindex) noindex++;
		else indexable++;

		const title = decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? '');
		if (!title) continue;
		if (!titles.has(title)) titles.set(title, []);
		titles.get(title).push({ rel, noindex: isNoindex });
	}

	const allDups = [...titles.entries()].filter(([, rows]) => rows.length > 1);
	const indexableDups = allDups.filter(([, rows]) => rows.some((row) => !row.noindex));

	console.log('=== Unique Title Audit (dist/) ===');
	console.log(`HTML files: ${indexable + noindex}`);
	console.log(`Indexable: ${indexable} | noindex: ${noindex}`);
	console.log(`Duplicate title groups (all): ${allDups.length}`);
	console.log(`Duplicate title groups (indexable): ${indexableDups.length}`);

	for (const [title, rows] of indexableDups.slice(0, 20)) {
		console.log(`\n[${rows.length}x] ${title}`);
		for (const row of rows.filter((r) => !r.noindex).slice(0, 8)) {
			console.log(`  ${row.rel}`);
		}
	}

	if (indexableDups.length > 0) {
		console.error('\nUnique title audit FAILED for indexable pages.');
		process.exit(1);
	}

	if (allDups.length > 0) {
		console.log(`\nNote: ${allDups.length} duplicate group(s) remain on noindex pages only.`);
	}

	console.log('\nUnique title audit PASSED for indexable pages.');
}

main();
