#!/usr/bin/env node
/**
 * Warn when indexable pages have fewer than MIN_WORDS in <main>.
 * Run after `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const MIN_WORDS = 200;

function walkHtml(dir, files = []) {
	if (!fs.existsSync(dir)) return files;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkHtml(full, files);
		else if (entry.name.endsWith('.html')) files.push(full);
	}
	return files;
}

function stripHtml(html) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z#0-9]+;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function wordCount(text) {
	return text.split(/\s+/).filter(Boolean).length;
}

function main() {
	if (!fs.existsSync(distDir)) {
		console.error('dist/ not found — run npm run build first');
		process.exit(1);
	}

	const low = [];
	let indexable = 0;

	for (const file of walkHtml(distDir)) {
		const rel = path.relative(distDir, file).replace(/\\/g, '/');
		const html = fs.readFileSync(file, 'utf8');
		if (/noindex/i.test(html)) continue;
		indexable++;
		const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
		const count = wordCount(stripHtml(main));
		if (count < MIN_WORDS) low.push({ rel, count });
	}

	low.sort((a, b) => a.count - b.count);

	console.log('=== Word Count Audit (dist/) ===');
	console.log(`Indexable pages: ${indexable}`);
	console.log(`Pages under ${MIN_WORDS} words in <main>: ${low.length}`);

	for (const row of low.slice(0, 25)) {
		console.log(`  [${row.count}] ${row.rel}`);
	}
	if (low.length > 25) console.log(`  ... +${low.length - 25} more`);

	if (low.length > 0) {
		console.error(`\nWord count audit FAILED (${low.length} thin pages).`);
		process.exit(1);
	}

	console.log('\nWord count audit PASSED.');
}

main();
