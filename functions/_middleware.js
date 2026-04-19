export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();
  const contentType = response.headers.get("content-type") || "";
  
  if (contentType.includes("text/html")) {
    let html = await response.text();
    
    // 获取密码
    const password = env.PASSWORD || "";
    let passwordHash = "";
    
    if (password) {
      // 这里的加密结果必须是 64 位字符，否则前端 js/password.js 的 isPasswordProtected 检查会失败
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // 调试：如果没密码，哈希为空
    // 强制替换任何包含 window.__ENV__.PASSWORD="..." 的地方
    // 我们尝试覆盖几种可能的写法
    const newHtml = html
      .replace(/window\.__ENV__\.PASSWORD\s*=\s*".*?"/, `window.__ENV__.PASSWORD="${passwordHash}"`)
      .replace(/window\.__ENV__\.PASSWORD\s*=\s*'.*?'/, `window.__ENV__.PASSWORD="${passwordHash}"`);
    
    const newResponse = new Response(newHtml, response);
    // 添加一个自定义头，方便验证中间件是否运行
    newResponse.headers.set("x-libretv-middleware", "active");
    newResponse.headers.set("x-password-set", password ? "yes" : "no");
    
    return newResponse;
  }
  
  return response;
}
