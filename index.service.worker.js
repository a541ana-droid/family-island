// Family Island service worker (web/UI team, see docs/WEB.md). Generated into output/web/index.service.worker.js
// by tools/web/export.sh, which fills in VERSION (hash of the whole build) and FILES (file -> hash of that file).
//  * offline: every file of the build lives in one cache named after the build hash, keyed "<file>?h=<file hash>";
//  * updates are IMMEDIATE (G-01): a new build installs (small files now; the big engine files are copied from the
//    old cache when unchanged, otherwise fetched by the page right after the reload), then skips waiting, takes
//    control of open pages and deletes the old caches. The page (web/shell.html) reloads itself ONCE on
//    'controllerchange', so the child always plays the newest build without waiting for the next launch.
const VERSION = "b994233b6200";
const PREFIX = 'family-island-';
const CACHE = PREFIX + VERSION;
const FILES = {"icons/icon_144.png": "66a15b137e9d", "icons/icon_180.png": "3bbe39fa36c1", "icons/icon_192.png": "ac148de1fe86", "icons/icon_32.png": "f803afffa77f", "icons/icon_512.png": "592fbe7583c8", "icons/icon_maskable_512.png": "e3a2ec70ca40", "icons/loading.png": "a9f1ca235e69", "icons/loading_hd.png": "c835671559df", "icons/ui_button.png": "de03f51e0be4", "icons/ui_button_pressed.png": "bd2191485d1f", "icons/walk_boy.png": "50aefcea3d15", "icons/walk_chick.png": "ca60246e7172", "icons/walk_chicken.png": "b35a9abbb6f2", "icons/walk_dog.png": "657a23100c8e", "icons/walk_girl.png": "b09076059bcd", "index.audio.position.worklet.js": "006bd6de7d9b", "index.audio.worklet.js": "fa4ddbcecba3", "index.html": "84908448c35d", "index.js": "b54de01ebd11", "index.manifest.json": "41d73677245e", "index.offline.html": "3c991f866ab3", "index.pck": "58cd9e6daf63", "index.wasm": "c91d71625bc4", "licenses/Almarai-OFL.txt": "1e8170c0c1c0"};
const BIG = ["index.pck", "index.wasm"];
const ALL = Object.keys(FILES);
const OFFLINE = 'index.offline.html';

const keyOf = (f) => f + '?h=' + FILES[f];

self.addEventListener('install', (event) => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE);
		const keys = await caches.keys();
		const isUpdate = keys.some((k) => k.startsWith(PREFIX) && k !== CACHE);
		await Promise.all(ALL.map(async (f) => {
			const key = keyOf(f);
			if (await cache.match(key)) {
				return;
			}
			// Unchanged since an earlier build (same file hash): copy it, no download (index.wasm, 40 MB, mostly).
			const old = await caches.match(key);
			if (old) {
				await cache.put(key, old);
				return;
			}
			// A changed big file on an update is fetched by the page right after the reload (through `fetch`
			// below, which keeps it), so the switch to the new build is not held up by a 40 MB download.
			if (isUpdate && BIG.includes(f)) {
				return;
			}
			// 'no-cache' = revalidate with the server so a stale HTTP-cached file never mixes in.
			const res = await fetch(new Request(f, { cache: 'no-cache' }));
			if (res.ok) {
				await cache.put(key, res);
			}
		}));
		await self.skipWaiting();
	})());
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
		await self.clients.claim();
	})());
});

function fileOf(url) {
	const scope = self.registration.scope;
	if (!url.startsWith(scope)) {
		return null;
	}
	let f = url.slice(scope.length).split('?')[0].split('#')[0];
	if (f === '') {
		f = 'index.html';
	}
	return Object.prototype.hasOwnProperty.call(FILES, f) ? f : null;
}

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') {
		return;
	}
	const file = fileOf(req.url);
	if (file === null) {
		return;
	}
	event.respondWith((async () => {
		const cache = await caches.open(CACHE);
		const key = keyOf(file);
		const hit = await cache.match(key);
		if (hit) {
			return hit;
		}
		try {
			const res = await fetch(new Request(req.url, { cache: 'no-cache' }));
			if (res.ok && res.status === 200) {
				await cache.put(key, res.clone());
			}
			return res;
		} catch (e) {
			if (req.mode === 'navigate') {
				const off = await caches.match(keyOf(OFFLINE));
				if (off) {
					return off;
				}
			}
			throw e;
		}
	})());
});

self.addEventListener('message', (event) => {
	if (event.data === 'update') {   // kept for pages of older builds that still ask
		self.skipWaiting();
	}
	if (event.data === 'version' && event.source) {
		event.source.postMessage({ version: VERSION });
	}
});
