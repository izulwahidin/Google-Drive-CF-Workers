const CACHE_TIME = 86400; // cache time in seconds
const CACHE_SIZE = 1024 * 1024 * 10; // cache size in bytes

const cache = caches.default;
const apikey = "apigoogle";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.match(/^\/dl\/(.+)\/(.+)$/)) {
    const download_id = RegExp.$1;
    const filename = RegExp.$2;

    const download_url = `https://www.googleapis.com/drive/v3/files/${download_id}?supportsTeamDrives=true&alt=media&key=${apikey}`;

    // Check if the response is already cached
    let response = await cache.match(request);

    if (!response) {
      // If not cached, forward the request to the origin
      const init = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      response = await fetch(download_url, init);

      // Cache the response for future requests
      response = new Response(response.body, response);
      response.headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      response.headers.delete("Content-Length");
      response.headers.delete("Accept-Ranges");

      const cacheControl = {
        browserTTL: CACHE_TIME,
        edgeTTL: CACHE_TIME,
        bypassCache: false,
      };

      const cacheKey = request.url;
      const cacheValue = response.clone();
      event.waitUntil(cache.put(cacheKey, cacheValue, cacheControl));

    } else {
      // If cached, return the response
      response = new Response(response.body, response);
      response.headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      response.headers.delete("Content-Length");
      response.headers.delete("Accept-Ranges");
    }

    return response;
  }

  // If the request does not match the download URL, return a 404 response
  return new Response("Not Found", { status: 404 });
}
