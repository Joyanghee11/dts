// 서비스 워커 파일 (sw.js)

const CACHE_NAME = 'freediving-scheduler-cache-v1';
// 캐싱할 기본 파일 목록 (앱의 루트와 매니페스트 파일)
// 만약 별도의 CSS, JS 파일이 있다면 여기에 추가해야 합니다.
const urlsToCache = [
  '/', // 앱의 루트 URL (index.html 또는 기본 페이지)
  './', // 위와 동일하게 루트를 의미할 수 있음
  'index.html', // 명시적으로 HTML 파일 지정 (실제 파일명 사용)
  'manifest.json'
  // 필요시 추가: 'styles/main.css', 'scripts/main.js', 'images/icon-192x192.png' 등
];

// 1. 서비스 워커 설치 이벤트
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  // 캐시 열고 기본 파일 추가
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // addAll은 네트워크 요청을 통해 리소스를 가져와 캐시에 저장합니다.
        // 하나라도 실패하면 전체 작업이 실패합니다.
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Service Worker: Failed to cache initial files:', error);
            // 설치 중 캐싱 실패 시 서비스워커 활성화를 막지 않도록 처리할 수도 있음
            // 또는 중요한 파일이면 설치 실패로 간주할 수도 있음
        });
      })
      .then(() => {
        console.log('Service Worker: Installation complete.');
        // 설치 즉시 활성화되도록 요청 (새 버전 업데이트 시 유용)
        return self.skipWaiting();
      })
  );
});

// 2. 서비스 워커 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
   // 이전 버전 캐시 정리
   event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Activation complete.');
        // 활성화 즉시 클라이언트 제어 시작
        return self.clients.claim();
    })
  );
});

// 3. 네트워크 요청 가로채기 (Fetch) 이벤트 - 캐시 우선 전략
self.addEventListener('fetch', event => {
  // console.log('Service Worker: Fetching ', event.request.url);
  // GET 요청만 캐싱 처리
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request) // 1. 캐시에서 먼저 찾아보기
      .then(response => {
        if (response) {
          // 1a. 캐시에 있으면 캐시된 응답 반환
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        // 1b. 캐시에 없으면 네트워크로 요청
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).then(
            networkResponse => {
                // 2. 네트워크 응답 성공 시
                // console.log('Service Worker: Fetched from network successfully:', event.request.url);

                // (선택적) 동적으로 캐싱할지 결정 (예: 특정 경로, 이미지 등)
                // 여기서는 기본 파일 외에는 캐싱하지 않음 (API 호출 등은 캐싱 안함)
                // if (shouldCacheDynamically(event.request.url)) {
                //     let responseToCache = networkResponse.clone(); // 응답은 한 번만 읽을 수 있으므로 복제
                //     caches.open(CACHE_NAME)
                //         .then(cache => {
                //             cache.put(event.request, responseToCache);
                //         });
                // }

                return networkResponse; // 원래 네트워크 응답 반환
            }
        ).catch(error => {
            // 3. 네트워크 요청 실패 시 (오프라인 상태 등)
            console.error('Service Worker: Fetch failed; returning offline page instead.', error);
            // (선택적) 오프라인 대체 페이지 보여주기
            // return caches.match('/offline.html');
            // 여기서는 특별한 대체 페이지 없이 그냥 에러 상태로 둠
        });
      })
  );
});