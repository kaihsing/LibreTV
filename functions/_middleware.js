export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();
  const contentType = response.headers.get("content-type") || "";
  
  if (contentType.includes("text/html")) {
    let html = await response.text();
    
    // 获取 Cloudflare 设置的 PASSWORD 环境变量
    let password = env.PASSWORD || "";
    let passwordToInject = "";
    
    if (password) {
      // 核心修復：自動刪除可能的換行符號或空格
      password = password.trim();
      
      // 检查是否已经是 64 位哈希值
      const isHash = /^[a-fA-F0-9]{64}$/.test(password);
      
      if (isHash) {
        // 如果已经是哈希，直接使用
        passwordToInject = password;
      } else {
        // 如果是明文，进行 SHA-256 加密
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        passwordToInject = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    }
    
    // 强制替换占位符。我们匹配多种可能的占位符格式以防万一。
    const newHtml = html
      .replace(/window\.__ENV__\.PASSWORD\s*=\s*["']\*\*\*["'];?/, `window.__ENV__.PASSWORD="${passwordToInject}";`)
      .replace(/window\.__ENV__\.PASSWORD\s*=\s*["']{{PASSWORD}}["'];?/, `window.__ENV__.PASSWORD="${passwordToInject}";`);
    
    return new Response(newHtml, response);
  }
  
  return response;
}
