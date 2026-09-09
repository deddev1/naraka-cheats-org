function initLazyDemoVideos() {
	document.querySelectorAll('[data-lazy-video]').forEach((root) => {
		if (root.dataset.lazyVideoInit === 'true') return;
		root.dataset.lazyVideoInit = 'true';

		const video = root.querySelector('video');
		const toggle = root.querySelector('.lazy-demo-video__toggle');
		const controls = root.querySelector('.lazy-demo-video__controls');
		const muteBtn = root.querySelector('.lazy-demo-video__mute');
		const progressInput = root.querySelector('.lazy-demo-video__progress');
		if (!video || !toggle) return;

		const playIcon = root.querySelector('.lazy-demo-video__icon--play');
		const pauseIcon = root.querySelector('.lazy-demo-video__icon--pause');
		const muteOnIcon = root.querySelector('.lazy-demo-video__mute-icon--on');
		const muteOffIcon = root.querySelector('.lazy-demo-video__mute-icon--off');
		const playLabel = toggle.getAttribute('aria-label') ?? 'Play video';
		const pauseLabel = toggle.dataset.pauseLabel ?? 'Pause video';
		const muteLabel = muteBtn?.dataset.muteLabel ?? 'Mute video';
		const unmuteLabel = muteBtn?.dataset.unmuteLabel ?? 'Unmute video';

		let lastVolume = 1;
		let seeking = false;

		const setPlaying = (playing) => {
			root.classList.toggle('is-playing', playing);
			toggle.setAttribute('aria-label', playing ? pauseLabel : playLabel);
			if (playIcon) playIcon.classList.toggle('is-hidden', playing);
			if (pauseIcon) pauseIcon.classList.toggle('is-hidden', !playing);
			if (controls) controls.hidden = !playing;
		};

		const syncProgressUi = () => {
			if (!progressInput || !Number.isFinite(video.duration) || video.duration <= 0) return;
			const value = Math.round((video.currentTime / video.duration) * 1000);
			progressInput.value = String(value);
			progressInput.setAttribute('aria-valuenow', String(value));
		};

		const syncMuteUi = () => {
			if (!muteBtn) return;
			const isMuted = video.muted || video.volume === 0;
			muteBtn.setAttribute('aria-label', isMuted ? unmuteLabel : muteLabel);
			if (muteOnIcon) muteOnIcon.classList.toggle('is-hidden', isMuted);
			if (muteOffIcon) muteOffIcon.classList.toggle('is-hidden', !isMuted);
		};

		const waitForCanPlay = () =>
			new Promise((resolve, reject) => {
				if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
					resolve(undefined);
					return;
				}
				const onReady = () => {
					cleanup();
					resolve(undefined);
				};
				const onError = () => {
					cleanup();
					reject(new Error('Video failed to load'));
				};
				const cleanup = () => {
					video.removeEventListener('canplay', onReady);
					video.removeEventListener('error', onError);
				};
				video.addEventListener('canplay', onReady, { once: true });
				video.addEventListener('error', onError, { once: true });
				video.load();
			});

		const playVideo = async () => {
			try {
				await waitForCanPlay();
				await video.play();
				setPlaying(true);
			} catch {
				setPlaying(false);
			}
		};

		const pauseVideo = () => {
			video.pause();
			setPlaying(false);
		};

		toggle.addEventListener('click', (event) => {
			event.stopPropagation();
			if (video.paused) void playVideo();
			else pauseVideo();
		});

		video.addEventListener('click', (event) => {
			if (event.target !== video) return;
			if (video.paused) void playVideo();
			else pauseVideo();
		});

		muteBtn?.addEventListener('click', (event) => {
			event.stopPropagation();
			if (video.muted || video.volume === 0) {
				video.muted = false;
				video.volume = lastVolume > 0 ? lastVolume : 0.8;
			} else {
				lastVolume = video.volume;
				video.muted = true;
			}
			syncMuteUi();
		});

		progressInput?.addEventListener('input', (event) => {
			event.stopPropagation();
			seeking = true;
			if (!Number.isFinite(video.duration) || video.duration <= 0) return;
			video.currentTime = (Number(progressInput.value) / 1000) * video.duration;
			syncProgressUi();
		});

		progressInput?.addEventListener('change', () => {
			seeking = false;
		});

		progressInput?.addEventListener('pointerdown', (event) => {
			event.stopPropagation();
			seeking = true;
		});
		progressInput?.addEventListener('pointerup', () => {
			seeking = false;
		});
		controls?.addEventListener('click', (event) => event.stopPropagation());

		video.addEventListener('timeupdate', () => {
			if (!seeking) syncProgressUi();
		});
		video.addEventListener('loadedmetadata', syncProgressUi);
		video.addEventListener('durationchange', syncProgressUi);
		video.addEventListener('ended', () => setPlaying(false));
		video.addEventListener('pause', () => {
			if (!video.ended) setPlaying(false);
		});

		video.volume = 1;
		syncMuteUi();
		setPlaying(false);
	});
}

initLazyDemoVideos();
document.addEventListener('astro:page-load', initLazyDemoVideos);
