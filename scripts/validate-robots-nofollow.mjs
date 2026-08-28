#!/usr/bin/env node
/**
 * Fail when built HTML or app source sets robots nofollow.
 * noindex alone keeps pages out of the index while allowing link equity to flow.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const SOURCE_PATTERNS = [
	/noindex,\s*nofollow/i,
	/['"]nofollow['"]/i,
	/rel=["'][^"']*nofollow/i,
	/X-Robots-Tag['"]?\s*:\s*['"][^'"]*nofollow/i,
];

function walkFiles(dir, ext, files = []) {
	if (!fs.existsSync(dir)) return files;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkFiles(full, ext, files);
		else if (entry.name.endsWith(ext)) files.push(full);
	}
	return files;
}

function main() {
	const issues = [];

	for (const file of walkFiles(path.join(rootDir, 'src'), '.astro')) {
		const text = fs.readFileSync(file, 'utf8');
		if (SOURCE_PATTERNS.some((pattern) => pattern.test(text))) {
			issues.push({ kind: 'source', rel: path.relative(rootDir, file) });
		}
	}

	for (const file of ['src/middleware.ts']) {
		const full = path.join(rootDir, file);
		if (!fs.existsSync(full)) continue;
		const text = fs.readFileSync(full, 'utf8');
		if (SOURCE_PATTERNS.some((pattern) => pattern.test(text))) {
			issues.push({ kind: 'source', rel: file });
		}
	}

	if (fs.existsSync(distDir)) {
		for (const file of walkFiles(distDir, '.html')) {
			const rel = path.relative(distDir, file).replace(/\\/g, '/');
			const html = fs.readFileSync(file, 'utf8');
			const robots = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? '';
			const googlebot = html.match(/<meta[^>]+name=["']googlebot["'][^>]*>/i)?.[0] ?? '';
			if (/nofollow/i.test(robots) || /nofollow/i.test(googlebot)) {
				issues.push({ kind: 'html', rel });
			}
		}
	}

	console.log('=== Robots Nofollow Audit ===');
	console.log(`Issues: ${issues.length}`);

	for (const issue of issues.slice(0, 30)) {
		console.log(`  [${issue.kind}] ${issue.rel}`);
	}

	if (issues.length > 0) {
		console.error('\nRobots nofollow audit FAILED.');
		process.exit(1);
	}

	console.log('\nRobots nofollow audit PASSED.');
}

main();
