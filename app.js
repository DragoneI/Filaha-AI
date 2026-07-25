
(function(){
  // ---------- Tab navigation ----------
  const tabs = document.querySelectorAll('.tab');
  const screens = document.querySelectorAll('.screen');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.screen;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      screens.forEach(s => s.classList.toggle('active', s.id === 'screen-' + target));
    });
  });

  // ---------- Help accordion ----------
  document.querySelectorAll('.help-q').forEach(q => {
    q.addEventListener('click', () => { q.closest('.help-item').classList.toggle('open'); });
  });

  // ---------- i18n engine (JSON-driven) ----------
  const DIR_MAP = {fr:'ltr', ar:'rtl'};
  const LANG_ATTR = {fr:'fr', ar:'ar'};
  let TRANSLATIONS = null;
  let currentLang = localStorage.getItem('filaha_lang') || 'fr';

  function getPath(obj, path){
    return path.split('.').reduce((o,k) => (o && o[k] !== undefined) ? o[k] : null, obj);
  }
  function t(key){
    if (!TRANSLATIONS) return '';
    return getPath(TRANSLATIONS[currentLang].app, key) || '';
  }

  function applyLanguage(lang){
    if (!TRANSLATIONS) return;
    currentLang = lang;
    localStorage.setItem('filaha_lang', lang);
    const dict = TRANSLATIONS[lang];
    document.documentElement.setAttribute('lang', LANG_ATTR[lang]);
    document.documentElement.setAttribute('dir', DIR_MAP[lang]);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = getPath(dict, el.getAttribute('data-i18n'));
      if (val !== null) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const val = getPath(dict, el.getAttribute('data-i18n-placeholder'));
      if (val !== null) el.setAttribute('placeholder', val);
    });
    document.querySelectorAll('.lang-opt').forEach(o => o.classList.toggle('active', o.dataset.lang === lang));
  }

  document.querySelectorAll('.lang-opt').forEach(opt => {
    opt.addEventListener('click', () => applyLanguage(opt.dataset.lang));
  });

  // ---------- Chat logic ----------
  const chatScroll = document.getElementById('chatScroll');
  const micBtn = document.getElementById('micBtn');
  const camBtn = document.getElementById('camBtn');
  const cameraInput = document.getElementById('cameraInput');
  const textField = document.getElementById('textField');
  let busy = false;

  function scrollToBottom(){ chatScroll.scrollTop = chatScroll.scrollHeight; }

  function addUserMessage(text, photoUrl){
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `
      <div class="msg-bubble">
        ${photoUrl ? `<img class="photo-thumb" src="${photoUrl}" alt="">` : ''}
        ${text ? text : ''}
      </div>`;
    chatScroll.appendChild(div);
    scrollToBottom();
  }

  function addTyping(){
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.id = 'typingMsg';
    div.innerHTML = `
      <span class="msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 21c-4-2-7-6-7-10a7 7 0 0 1 14 0c0 4-3 8-7 10z"/></svg></span>
      <div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
    chatScroll.appendChild(div);
    scrollToBottom();
  }

  function removeTyping(){
    const el = document.getElementById('typingMsg');
    if (el) el.remove();
  }

  function addBotMessage(text, src, i18nKey){
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.innerHTML = `
      <span class="msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 21c-4-2-7-6-7-10a7 7 0 0 1 14 0c0 4-3 8-7 10z"/></svg></span>
      <div class="msg-bubble"${i18nKey ? ` data-i18n="${i18nKey}"` : ''}>${text}${src ? `<span class="src"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>${src}</span>` : ''}</div>`;
    chatScroll.appendChild(div);
    scrollToBottom();
  }

  function pushHistory(icon, titleKey, title, summaryKey, summary){
    const list = document.getElementById('historyList');
    const empty = list.querySelector('.h-empty');
    if (empty) empty.remove();
    const card = document.createElement('div');
    card.className = 'h-card';
    const now = new Date();
    const time = now.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'ar-MA', {day:'2-digit', month:'short'}) + ' · ' + now.toLocaleTimeString(currentLang === 'fr' ? 'fr-FR' : 'ar-MA', {hour:'2-digit', minute:'2-digit'});
    card.innerHTML = `
      <span class="h-icon ${icon === 'voice' ? 'voice' : 'photo'}">
        ${icon === 'voice'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'}
      </span>
      <div class="h-body">
        <div class="h-top"><h4${titleKey ? ` data-i18n="${titleKey}"` : ''}>${title}</h4><span class="h-date">${time}</span></div>
        <p${summaryKey ? ` data-i18n="${summaryKey}"` : ''}>${summary}</p>
      </div>`;
    list.prepend(card);
  }

  // ---------- Connexion au Worker Cloudflare (pipeline RAG reel) ----------
  const WORKER_URL = 'https://filaha-ai.dragonetechnology.workers.dev/ask';

  function getDeviceToken(){
    let token = localStorage.getItem('filaha_device_token');
    if (!token){
      token = crypto.randomUUID();
      localStorage.setItem('filaha_device_token', token);
    }
    return token;
  }

  async function askBackend(question){
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, deviceToken: getDeviceToken(), lang: currentLang }),
    });
    const data = await resp.json();
    if (resp.status === 429) throw new Error('RATE_LIMIT');
    if (!resp.ok) throw new Error(data.error || 'ERROR');
    return data; // { answer, sources, engine }
  }

    async function respond(userText, photoUrl){
    if (busy || !userText) return;
    busy = true;
    addUserMessage(userText, photoUrl);
    addTyping();
    try {
      const data = await askBackend(userText);
      removeTyping();
      const srcLabel = data.sources && data.sources.length ? data.sources.join(', ') : null;
      addBotMessage(data.answer, srcLabel);
      const shortTitle = userText.length > 34 ? userText.slice(0,34) + '…' : userText;
      const shortSummary = data.answer.length > 70 ? data.answer.slice(0,70) + '…' : data.answer;
      pushHistory(photoUrl ? 'photo' : 'voice', null, shortTitle, null, shortSummary);
    } catch (err) {
      removeTyping();
      
      // On affiche l'erreur réelle renvoyée par le Worker au lieu du message générique
      let msg;
      if (err.message === 'RATE_LIMIT') {
        msg = currentLang === 'ar' 
          ? 'عدد كبير جدا من الأسئلة. حاول بعد بضع دقائق.' 
          : 'Trop de questions envoyées. Réessaie dans quelques minutes.';
      } else {
        // Affiche l'erreur système exacte (ex: HF embedding, Supabase, etc.)
        msg = `⚠️ ${err.message}`;
      }
      
      addBotMessage(msg, null);
    }
    busy = false;
  }


  // Suggestion chips — la question canonique vient de translations.json (knowledge.<cle>.q),
  // mais la reponse est desormais generee par le pipeline RAG, plus par un texte fige.
  document.getElementById('chipsRow').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || !TRANSLATIONS) return;
    const key = chip.dataset.q;
    const entry = getPath(TRANSLATIONS[currentLang].app, 'knowledge.' + key);
    if (entry && entry.q) respond(entry.q);
  });

  // Mic — reconnaissance vocale reelle via l'API Web Speech (native navigateur, gratuite).
  // Si le navigateur ne la supporte pas (rare sur Chrome Android), on bascule sur le clavier.
  micBtn.addEventListener('click', () => {
    if (busy) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { textField.focus(); return; }
    const recognition = new SR();
    recognition.lang = currentLang === 'ar' ? 'ar-MA' : 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    micBtn.classList.add('listening');
    recognition.start();
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      micBtn.classList.remove('listening');
      respond(transcript);
    };
    recognition.onerror = () => { micBtn.classList.remove('listening'); };
    recognition.onend = () => { micBtn.classList.remove('listening'); };
  });

  // Camera (live capture, with file-input fallback)
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  let cameraStream = null;

  async function openCamera(){
    try{
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      cameraVideo.srcObject = cameraStream;
      cameraModal.classList.add('open');
    }catch(err){
      cameraInput.click();
    }
  }
  function closeCamera(){
    if (cameraStream){ cameraStream.getTracks().forEach(tr => tr.stop()); cameraStream = null; }
    cameraModal.classList.remove('open');
  }
  // NOTE : le backend actuel (worker.js) ne fait pas d'analyse d'image — seule la
  // recherche/generation textuelle est branchee. La photo est affichee dans le chat
  // pour l'instant, mais le diagnostic visuel reste a construire (pipeline vision separe).
  function notifyPhotoUnavailable(){
    const msg = currentLang === 'ar'
      ? 'تحليل الصور غير متوفر بعد. صف المشكلة بالكلمات من فضلك.'
      : "L'analyse de photo n'est pas encore disponible. Decris le probleme avec des mots pour l'instant.";
    addBotMessage(msg, null);
  }

  function capturePhoto(){
    const w = cameraVideo.videoWidth, h = cameraVideo.videoHeight;
    if (!w || !h) return;
    cameraCanvas.width = w; cameraCanvas.height = h;
    cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0, w, h);
    cameraCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      closeCamera();
      addUserMessage('', url);
      notifyPhotoUnavailable();
    }, 'image/jpeg', 0.9);
  }
  camBtn.addEventListener('click', () => { if (!busy) openCamera(); });
  document.getElementById('cameraClose').addEventListener('click', closeCamera);
  document.getElementById('cameraShutter').addEventListener('click', capturePhoto);
  cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    addUserMessage('', url);
    notifyPhotoUnavailable();
    cameraInput.value = '';
  });

  // Champ texte — envoie directement au pipeline RAG (Worker), sans logique de mots-cles.
  textField.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const val = textField.value.trim();
    if (!val || busy) return;
    respond(val);
    textField.value = '';
  });

  // History clear
  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    const list = document.getElementById('historyList');
    list.innerHTML = `
      <div class="h-empty">
        <span class="mark-lg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg></span>
        <p data-i18n="app.history.emptyText">Aucune question pour l'instant. Posez votre première question depuis l'accueil.</p>
      </div>`;
  });

  // ---------- Load translations, then populate initial content ----------
  fetch('translations.json')
    .then(r => r.json())
    .then(data => {
      TRANSLATIONS = data;
      applyLanguage(currentLang);
      addBotMessage(TRANSLATIONS[currentLang].app.chat.welcome, null, 'app.chat.welcome');
      // L'historique demarre vide desormais : il se remplit au fil des vraies questions
      // posees au pipeline RAG, plus de contenu de demonstration pre-rempli.
    })
    .catch(() => {
      addBotMessage("Salam ! Je suis Filaha.AI. Posez-moi une question, parlez, ou envoyez une photo d'une feuille.");
    });
})();
