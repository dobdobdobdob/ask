(function(){
  const script = document.currentScript;
  const slug = script ? script.getAttribute('data-slug') : null;
  if(!slug) return;

  const ASK_SERVER = 'https://ask-server.thedobrien.workers.dev';
  const WORKER = 'https://spring-pine-fd21.thedobrien.workers.dev/';

  let chatOpen = false, chatHistory = [], chatLoading = false, systemPrompt = '', avatarDataUrl = null, profileName = 'Ask';

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #ask-embed-btn{position:fixed;bottom:24px;right:24px;z-index:999999;background:#111;color:#fff;border:none;border-radius:50px;padding:12px 22px;font-family:sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 8px 30px rgba(0,0,0,0.2);transition:all 0.2s;}
    #ask-embed-btn:hover{background:#CCFF00;color:#111;}
    .ask-dot{width:8px;height:8px;background:#22c55e;border-radius:50%;animation:askPulse 2s infinite;}
    @keyframes askPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.3);opacity:0.7;}}
    #ask-embed-panel{position:fixed;bottom:80px;right:24px;z-index:999998;width:340px;height:480px;background:#fff;border:1px solid #E2DED8;border-radius:8px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.12);transform:scale(0.95) translateY(10px);opacity:0;pointer-events:none;transition:all 0.25s ease;overflow:hidden;}
    #ask-embed-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto;}
    .ask-ph{padding:14px 16px;border-bottom:1px solid #E2DED8;display:flex;align-items:center;justify-content:space-between;background:#F7F6F3;flex-shrink:0;}
    .ask-ph-name{font-family:serif;font-size:15px;font-weight:600;color:#1A1A1A;}
    .ask-ph-sub{font-size:11px;color:#999;margin-top:2px;}
    .ask-ph-close{background:none;border:none;color:#999;cursor:pointer;font-size:16px;line-height:1;}
    .ask-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;}
    .ask-msg{display:flex;gap:8px;}
    .ask-msg.user{flex-direction:row-reverse;}
    .ask-av{width:26px;height:26px;border-radius:50%;border:1px solid #E2DED8;background:#EEECE8;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#999;flex-shrink:0;margin-top:2px;overflow:hidden;}
    .ask-av img{width:100%;height:100%;object-fit:cover;}
    .ask-bub{padding:8px 12px;border-radius:2px;font-size:13px;line-height:1.6;max-width:85%;font-family:sans-serif;}
    .ask-msg.assistant .ask-bub{background:#F7F6F3;border:1px solid #E2DED8;color:#1A1A1A;}
    .ask-msg.user .ask-bub{background:#111;color:#fff;}
    .ask-typing{display:flex;gap:4px;align-items:center;padding:8px 12px;background:#F7F6F3;border:1px solid #E2DED8;width:fit-content;border-radius:2px;}
    .ask-typing span{width:5px;height:5px;background:#8AB300;border-radius:50%;animation:askBounce 1.2s infinite;}
    .ask-typing span:nth-child(2){animation-delay:0.2s;}
    .ask-typing span:nth-child(3){animation-delay:0.4s;}
    @keyframes askBounce{0%,60%,100%{transform:translateY(0);opacity:0.4;}30%{transform:translateY(-4px);opacity:1;}}
    .ask-suggs{padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid #E2DED8;flex-shrink:0;}
    .ask-sugg{font-size:11px;padding:4px 10px;background:#F7F6F3;border:1px solid #E2DED8;color:#555;border-radius:100px;cursor:pointer;font-family:sans-serif;}
    .ask-sugg:hover{border-color:#8AB300;color:#1A1A1A;}
    .ask-input-row{padding:10px;border-top:1px solid #E2DED8;display:flex;gap:8px;flex-shrink:0;}
    .ask-input{flex:1;font-family:sans-serif;font-size:13px;background:#F7F6F3;border:1px solid #E2DED8;color:#1A1A1A;padding:8px 12px;outline:none;border-radius:2px;resize:none;}
    .ask-input:focus{border-color:#8AB300;}
    .ask-input::placeholder{color:#999;}
    .ask-send{width:34px;height:34px;background:#111;border:none;border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .ask-send:hover{background:#CCFF00;}
    .ask-send:disabled{opacity:0.3;}
    .ask-footer{font-size:10px;color:#C8C8C0;text-align:center;padding:6px;font-family:sans-serif;}
    @media(max-width:480px){#ask-embed-panel{width:calc(100vw - 32px);right:16px;}}
  `;
  document.head.appendChild(style);

  // Load profile data
  fetch(`${ASK_SERVER}/${slug}`)
    .then(r=>r.json())
    .then(d=>{
      systemPrompt = d.systemPrompt || '';
      avatarDataUrl = d.avatar || null;
      profileName = d.name ? `Ask ${d.name.split(' ')[0]}` : 'Ask';
      buildUI(d);
    })
    .catch(()=>{ buildUI(null); });

  function buildUI(d){
    // Button
    const btn = document.createElement('button');
    btn.id = 'ask-embed-btn';
    btn.innerHTML = `<div class="ask-dot"></div>${profileName}`;
    btn.onclick = toggle;
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'ask-embed-panel';
    const name = d?.name || 'AI Assistant';
    const fn = name.split(' ')[0];
    panel.innerHTML = `
      <div class="ask-ph">
        <div><div class="ask-ph-name">Ask ${fn}</div><div class="ask-ph-sub">Powered by Claude AI · ask.menos-labs.com</div></div>
        <button class="ask-ph-close" onclick="document.getElementById('ask-embed-panel').classList.remove('open')">✕</button>
      </div>
      <div class="ask-suggs" id="ask-suggs">
        <button class="ask-sugg" onclick="askS(this)">Experience</button>
        <button class="ask-sugg" onclick="askS(this)">Key skills</button>
        <button class="ask-sugg" onclick="askS(this)">Why hire?</button>
      </div>
      <div class="ask-msgs" id="ask-msgs"></div>
      <div class="ask-input-row">
        <textarea class="ask-input" id="ask-input" placeholder="Ask anything..." rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();askSend();}"></textarea>
        <button class="ask-send" id="ask-send-btn" onclick="askSend()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div class="ask-footer">Powered by <a href="https://ask.menos-labs.com" target="_blank" style="color:#8AB300;text-decoration:none;">Menos Labs</a></div>
    `;
    document.body.appendChild(panel);
    addAskMsg('assistant', `Hi! I'm ${name}'s AI assistant. Ask me anything about their background or experience.`);
  }

  function toggle(){chatOpen=!chatOpen;const p=document.getElementById('ask-embed-panel');if(p)p.classList.toggle('open',chatOpen);if(chatOpen)setTimeout(()=>document.getElementById('ask-input')?.focus(),300);}

  function getInit(){const n=profileName.replace('Ask ','');const p=n.split(' ');return(p.length>=2?p[0][0]+p[p.length-1][0]:p[0]?.[0]||'?').toUpperCase();}

  function addAskMsg(role,text){
    const wrap=document.getElementById('ask-msgs');if(!wrap)return;
    const div=document.createElement('div');div.className='ask-msg '+role;
    const av=document.createElement('div');av.className='ask-av';
    if(role==='assistant'){if(avatarDataUrl)av.innerHTML=`<img src="${avatarDataUrl}" alt="">`;else av.textContent=getInit();}
    else{av.textContent='You';av.style.fontSize='9px';}
    const b=document.createElement('div');b.className='ask-bub';b.textContent=text;
    div.appendChild(av);div.appendChild(b);wrap.appendChild(div);wrap.scrollTop=wrap.scrollHeight;
  }

  window.askS=function(btn){
    const s=document.getElementById('ask-suggs');if(s)s.style.display='none';
    document.getElementById('ask-input').value=btn.textContent;askSend();
  };

  window.askSend=async function(){
    const input=document.getElementById('ask-input');if(!input)return;
    const text=input.value.trim();if(!text||chatLoading)return;
    chatLoading=true;const sb=document.getElementById('ask-send-btn');if(sb)sb.disabled=true;
    const s=document.getElementById('ask-suggs');if(s)s.style.display='none';
    input.value='';addAskMsg('user',text);chatHistory.push({role:'user',content:text});
    // typing
    const wrap=document.getElementById('ask-msgs');
    const td=document.createElement('div');td.id='ask-typing-msg';td.className='ask-msg assistant';
    const tav=document.createElement('div');tav.className='ask-av';if(avatarDataUrl)tav.innerHTML=`<img src="${avatarDataUrl}" alt="">`;else tav.textContent=getInit();
    td.appendChild(tav);const tt=document.createElement('div');tt.className='ask-typing';tt.innerHTML='<span></span><span></span><span></span>';td.appendChild(tt);wrap.appendChild(td);wrap.scrollTop=wrap.scrollHeight;
    try{
      const res=await fetch(WORKER,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:300,system:systemPrompt,messages:chatHistory})});
      const data=await res.json();
      const reply=data.content?.[0]?.text||'Connection issue.';
      document.getElementById('ask-typing-msg')?.remove();
      addAskMsg('assistant',reply);chatHistory.push({role:'assistant',content:reply});
    }catch(e){document.getElementById('ask-typing-msg')?.remove();addAskMsg('assistant','Connection issue.');}
    chatLoading=false;if(sb)sb.disabled=false;
  };
})();
