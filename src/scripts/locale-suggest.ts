type LocaleMeta = {
	code: string;
	name: string;
	nativeName: string;
	region: string;
};

type LocaleSuggestConfig = {
	defaultLocale: string;
	locales: LocaleMeta[];
	pageSlugs: Record<string, string>;
	leadTemplate: string;
	versionTemplate: string;
	ariaLabel: string;
	dismissLabel: string;
};

function detectPreferredLocale(locales: LocaleMeta[], defaultLocale: string): string {
	const cookie = document.cookie.match(/(?:^|;\s*)nc_locale=([^;]+)/)?.[1];
	if (cookie && locales.some((l) => l.code === cookie)) return cookie;

	const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
	for (const tag of langs) {
		const primary = tag.toLowerCase().split('-')[0];
		if (locales.some((l) => l.code === primary) && primary !== defaultLocale) {
			return primary;
		}
	}
	return defaultLocale;
}

function pathForLocale(locale: string, pageSlugs: Record<string, string>): string {
	const slug = pageSlugs[locale];
	return slug ? `/${locale}/${slug}/` : `/${locale}/`;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
	let result = template;
	for (const [key, value] of Object.entries(vars)) {
		result = result.replaceAll(`{{${key}}}`, value);
	}
	return result;
}

/** Soft locale banner for EN visitors — no auto-redirect. */
export function initLocaleSuggest(): void {
	const root = document.getElementById('locale-suggest-root');
	if (!root || root.dataset.localeSuggestInit === 'true') return;
	root.dataset.localeSuggestInit = 'true';

	const raw = root.dataset.config;
	if (!raw) return;

	let config: LocaleSuggestConfig;
	try {
		config = JSON.parse(raw) as LocaleSuggestConfig;
	} catch {
		return;
	}

	if (sessionStorage.getItem('nc_locale_dismissed')) return;

	const run = () => {
		const preferred = detectPreferredLocale(config.locales, config.defaultLocale);
		if (preferred === config.defaultLocale) return;

		const target = config.locales.find((l) => l.code === preferred);
		if (!target) return;

		const href = pathForLocale(preferred, config.pageSlugs);
		const lead = fillTemplate(config.leadTemplate, {
			nativeName: target.nativeName,
			region: target.region,
		});
		const versionLabel = fillTemplate(config.versionTemplate, { name: target.name });

		root.innerHTML = `
			<p class="locale-suggest__text">
				${lead}<a href="${href}" data-locale-link="${target.code}">${versionLabel}</a>
			</p>
			<button type="button" class="locale-suggest__dismiss" aria-label="${config.dismissLabel}">×</button>
		`;
		root.hidden = false;
		root.setAttribute('aria-label', config.ariaLabel);

		root.querySelector<HTMLAnchorElement>('[data-locale-link]')?.addEventListener('click', () => {
			document.cookie = `nc_locale=${target.code};path=/;max-age=31536000;SameSite=Lax`;
		});

		root.querySelector<HTMLButtonElement>('.locale-suggest__dismiss')?.addEventListener('click', () => {
			sessionStorage.setItem('nc_locale_dismissed', '1');
			root.hidden = true;
			root.innerHTML = '';
		});
	};

	if ('requestIdleCallback' in window) {
		requestIdleCallback(run, { timeout: 3000 });
	} else {
		window.setTimeout(run, 1);
	}
}
