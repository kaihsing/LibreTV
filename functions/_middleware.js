export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();
  const contentType = response.headers.get("content-type") || "";
  
  if (contentType.includes("text/html")) {
    let html = await response.text();
    
    // 处理普通密码
    const password = env.PASSWORD || "";
    let passwordHash = "";
    
    if (password) {
      // 直接在中間件內實現 SHA-256，避免 import 失敗
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // 使用更強大的正則表達式進行替換，處理可能存在的空格
    // 匹配 window.__ENV__.PASSWORD = "***" 或 window.__ENV__.PASSWORD="***"
    html = html.replace(/window\.__ENV__\.PASSWORD\s*=\s*["']\*\*\*["'];?/, 
      `window.__ENV__.PASSWORD="${passwordHash}";`);
    
    return new Response(html, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  }
  
  return response;
}
