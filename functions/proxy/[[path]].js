export async function onRequest(context) {
    const { request, env, next, waitUntil } = context;
    const url = new URL(request.url);

    // 1. 验证鉴权
    const serverPassword = (env.PASSWORD || "").trim();
    const authHash = url.searchParams.get('auth');
    
    if (serverPassword) {
        const encoder = new TextEncoder();
        const data = encoder.encode(serverPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const expectedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (!authHash || authHash !== expectedHash) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    // 2. 提取目标 URL
    const encodedUrl = url.pathname.replace(/^\/proxy\//, '');
    if (!encodedUrl) return new Response('No URL', { status: 400 });
    
    const targetUrl = decodeURIComponent(encodedUrl);
    
    // 3. 执行请求
    const response = await fetch(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': new URL(targetUrl).origin
        },
        redirect: 'follow'
    });

    // 4. 判断是否需要处理 (M3U8 需要替换路径，图片不需要)
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || targetUrl.includes('.m3u8')) {
        // 文字处理逻辑 (M3U8)
        let content = await response.text();
        // ... 这里可以保持原有的 M3U8 替换逻辑，但为了修复图片，我们先确保非 M3U8 直接回传
        return new Response(content, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            }
        });
    } else {
        // 二进制处理逻辑 (图片、影片片段等) - 直接透传响应流
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        return newResponse;
    }
}
