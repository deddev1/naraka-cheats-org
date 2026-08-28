#!/usr/bin/env node
/**
 * Ensures every built HTML file has <head> as the first child of <html>
 * and includes baseline document metadata.
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

function firstElementTag(html) {
	const open = html.match(/<html\b[^>]*>/i);
	if (!open) return null;
	const afterOpen = html.slice(open.index + open[0].length);
	const trimmed = afterOpen.replace(/^\s*(<!--[\s\S]*?-->\s*)*/, '');
	const match = trimmed.match(/^<([a-zA-Z0-9:-]+)/);
	return match?.[1]?.toLowerCase() ?? null;
}

function main() {
	if (!fs.existsSync(distDir)) {
		console.error('dist/ not found — run npm run build first');
		process.exit(1);
	}

	const issues = [];
	const htmlFiles = walkHtml(distDir);

	for (const file of htmlFiles) {
		const rel = path.relative(distDir, file).replace(/\\/g, '/');
		const html = fs.readFileSync(file, 'utf8');

		if (!/<html\b/i.test(html)) {
			issues.push({ rel, kind: 'missing-html' });
			continue;
		}

		const first = firstElementTag(html);
		if (first !== 'head') {
			issues.push({ rel, kind: 'head-not-first', detail: first ?? 'none' });
		}

		const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
		if (!head) {
			issues.push({ rel, kind: 'missing-head' });
			continue;
		}

		const checks = {
			charset: /<meta\s+charset/i.test(head),
			viewport: /<meta\s+name=["']viewport/i.test(head),
			title: /<title>[^<]+<\/title>/i.test(head),
			description: /<meta\s+name=["']description/i.test(head),
			canonical: /<link\s+rel=["']canonical/i.test(head),
		};

		for (const [key, ok] of Object.entries(checks)) {
			if (!ok) issues.push({ rel, kind: `missing-${key}` });
		}
	}

	console.log('=== Document Head Audit (dist/) ===');
	console.log(`HTML files: ${htmlFiles.length}`);
	console.log(`Issues: ${issues.length}`);

	const grouped = {};
	for (const issue of issues) {
		grouped[issue.kind] ??= [];
		grouped[issue.kind].push(issue);
	}

	for (const [kind, rows] of Object.entries(grouped).sort()) {
		console.log(`\n--- ${kind} (${rows.length}) ---`);
		for (const row of rows.slice(0, 12)) {
			console.log(`  ${row.rel}${row.detail ? `: ${row.detail}` : ''}`);
		}
		if (rows.length > 12) console.log(`  ... +${rows.length - 12} more`);
	}

	if (issues.length > 0) {
		console.error('\nDocument head audit FAILED.');
		process.exit(1);
	}

	console.log('\nDocument head audit PASSED.');
}

main();
