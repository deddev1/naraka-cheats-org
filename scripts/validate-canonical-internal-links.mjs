#!/usr/bin/env node
/**
 * Fail when indexable HTML links to known non-canonical URL patterns.
 * Locale blog stubs and cannibal long-tail URLs canonicalise elsewhere.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const NON_CANONICAL_PATTERNS = [
	{ id: 'locale-blog', regex: /href=["']\/[a-z]{2}\/blog\//i },
	{
		id: 'cannibal-en',
		regex: /href=["']\/naraka-(esp-hack|wallhack|aimbot-hack|soft-aim|mod-menu|unlock-all|cheat-download)\//i,
	},
];

function walkHtml(dir, files = []) {
	if (!fs.existsSync(dir)) return files;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkHtml(full, files);
		else if (entry.name.endsWith('.html')) files.push(full);
	}
	return files;
}

function main() {
	if (!fs.existsSync(distDir)) {
		console.error('dist/ not found — run npm run build first');
		process.exit(1);
	}

	const issues = [];

	for (const file of walkHtml(distDir)) {
		const rel = path.relative(distDir, file).replace(/\\/g, '/');
		const html = fs.readFileSync(file, 'utf8');
		if (/noindex/i.test(html)) continue;

		for (const pattern of NON_CANONICAL_PATTERNS) {
			if (pattern.regex.test(html)) {
				issues.push({ rel, kind: pattern.id });
			}
		}
	}

	console.log('=== Canonical Internal Link Audit (dist/) ===');
	console.log(`Indexable pages linking to non-canonical URLs: ${issues.length}`);

	const byKind = new Map();
	for (const issue of issues) {
		if (!byKind.has(issue.kind)) byKind.set(issue.kind, []);
		byKind.get(issue.kind).push(issue.rel);
	}

	for (const [kind, rows] of byKind) {
		console.log(`\n[${kind}] ${rows.length} page(s)`);
		for (const rel of rows.slice(0, 10)) console.log(`  ${rel}`);
		if (rows.length > 10) console.log(`  ... +${rows.length - 10} more`);
	}

	if (issues.length > 0) {
		console.error('\nCanonical internal link audit FAILED.');
		process.exit(1);
	}

	console.log('\nCanonical internal link audit PASSED.');
}

main();
