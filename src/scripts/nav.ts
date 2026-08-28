/** Mobile nav menu + scroll state — no React hydration. */
export function initNav(): void {
	const header = document.querySelector<HTMLElement>('.site-header[data-nav]');
	if (!header || header.dataset.navInit === 'true') return;
	header.dataset.navInit = 'true';

	const menuBtn = header.querySelector<HTMLButtonElement>('.site-menu');
	const panel = header.querySelector<HTMLElement>('#site-nav-panel');
	if (!menuBtn || !panel) return;

	const openLabel = menuBtn.getAttribute('aria-label') ?? 'Open menu';
	const closeLabel = menuBtn.dataset.closeLabel ?? 'Close menu';

	const setOpen = (open: boolean) => {
		header.classList.toggle('is-open', open);
		menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
		menuBtn.setAttribute('aria-label', open ? closeLabel : openLabel);
		panel.hidden = !open;
		document.body.classList.toggle('nav-lock', open);
	};

	const onScroll = () => {
		header.classList.toggle('is-scrolled', window.scrollY > 8);
	};

	menuBtn.addEventListener('click', () => {
		setOpen(!header.classList.contains('is-open'));
	});

	panel.querySelectorAll<HTMLAnchorElement>('.site-panel__nav a').forEach((link) => {
		link.addEventListener('click', () => setOpen(false));
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') setOpen(false);
	});

	window.addEventListener(
		'resize',
		() => {
			if (window.matchMedia('(min-width: 1025px)').matches) setOpen(false);
		},
		{ passive: true },
	);

	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();
	setOpen(false);

	header.querySelectorAll<HTMLAnchorElement>('[data-locale]').forEach((link) => {
		link.addEventListener('click', () => {
			const code = link.dataset.locale;
			if (code) {
				document.cookie = `nc_locale=${code};path=/;max-age=31536000;SameSite=Lax`;
			}
		});
	});
}
