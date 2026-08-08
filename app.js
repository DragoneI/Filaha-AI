(function(){
  // ---------- Navigation Onglets ----------
  const tabs = document.querySelectorAll('.tab');
  const screens = document.querySelectorAll('.screen');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.screen;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      screens.forEach(s => s.classList.toggle('active', s.id === 'screen-' + target));
    });
  });

  // ---------- Accordéon Aide ----------
  document.querySelectorAll('.help-q').forEach(q => {
    q.addEventListener('click', () => { q.closest('.help-item').classList.toggle('open'); });
  });

  // ---------- Moteur i18n (JSON) ----------
  const DIR_MAP = {fr:'ltr', ar:'rtl'};
  const LANG_ATTR = {fr:'fr', ar:'ar'};
  let TRANSLATIONS = null;
  let currentLang = localStorage.getItem('filaha_lang') || 'fr';

  // Texte d'avertissement affiché sous chaque réponse générée par l'IA
  const DISCLAIMER_TEXT = {
    fr: "Filaha.AI est une IA et peut faire des erreurs. Vérifiez les informations importantes ou consultez un spécialiste.",
    ar: "Filaha.AI ذكاء اصطناعي وقد يرتكب أخطاء. تحقق من المعلومات المهمة أو استشر مختصا."
  };

  function getPath(obj, path){
    return path.split('.').reduce((o,k) => (o && o[k] !== undefined) ? o[k] : null, obj);
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

  // ---------- Chat & Éléments DOM ----------
  const chatScroll = document.getElementById('chatScroll');
  const micBtn = document.getElementById('micBtn');
  const camBtn = document.getElementById('camBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  const sendBtn = document.getElementById('sendBtn');
  const textField = document.getElementById('textField');
  const fileInput = document.getElementById('fileInput');
  const cameraInput = document.getElementById('cameraInput');

  // Preview elements
  const attachPreview = document.getElementById('attachPreview');
  const attachName = document.getElementById('attachName');
  const attachIconWrap = document.getElementById('attachIconWrap');
  const attachRemove = document.getElementById('attachRemove');

  let busy = false;
  let pendingImageBase64 = null;
  let pendingImageBlobUrl = null;

  function scrollToBottom(){ chatScroll.scrollTop = chatScroll.scrollHeight; }

  function refreshSendState(){
    const hasText = textField.value.trim().length > 0;
    const hasImage = !!pendingImageBase64;
    sendBtn.classList.toggle('is-empty', !hasText && !hasImage);
  }

  textField.addEventListener('input', refreshSendState);

  // ---------- Gestion des Fichiers & Images ----------
  function processFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingImageBase64 = e.target.result;
      pendingImageBlobUrl = URL.createObjectURL(file);
      
      attachName.textContent = file.name || "photo.jpg";
      attachIconWrap.innerHTML = `<img src="${pendingImageBlobUrl}" alt="Preview">`;
      attachPreview.classList.add('show');
      
      refreshSendState();
    };
    reader.readAsDataURL(file);
  }

  function clearPendingImage() {
    pendingImageBase64 = null;
    if (pendingImageBlobUrl) {
      URL.revokeObjectURL(pendingImageBlobUrl);
      pendingImageBlobUrl = null;
    }
    fileInput.value = '';
    cameraInput.value = '';
    attachPreview.classList.remove('show');
    refreshSendState();
  }

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  });
  cameraInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  });
  attachRemove.addEventListener('click', clearPendingImage);

  // ---------- Rendu des Messages & Actions (Copier / Modifier) ----------
  function addUserMessage(text, imageSrc){
    const div = document.createElement('div');
    div.className = 'msg user';
    
    // Échapper le texte HTML pour sécurité
    const safeText = text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    
    div.innerHTML = `
      <div class="msg-bubble" data-raw-text="${safeText}">
        ${imageSrc ? `<img class="photo-thumb" src="${imageSrc}" alt="Photo envoyée">` : ''}
        ${safeText ? `<span>${safeText}</span>` : ''}
        <div class="msg-actions">
          ${safeText ? `
          <button class="msg-action-btn edit-btn" title="Modifier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Modifier</span>
          </button>` : ''}
          <button class="msg-action-btn copy-btn" title="Copier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copier</span>
          </button>
        </div>
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

  // showDisclaimer=false pour les messages système/erreur qui ne sont pas de vraies réponses générées
  function addBotMessage(text, src, i18nKey, showDisclaimer = true){
    const div = document.createElement('div');
    div.className = 'msg bot';
    const disclaimerHtml = showDisclaimer
      ? `<div class="ai-disclaimer">${DISCLAIMER_TEXT[currentLang] || DISCLAIMER_TEXT.fr}</div>`
      : '';
    div.innerHTML = `
      <span class="msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 21c-4-2-7-6-7-10a7 7 0 0 1 14 0c0 4-3 8-7 10z"/></svg></span>
      <div class="msg-bubble" ${i18nKey ? `data-i18n="${i18nKey}"` : ''} data-raw-text="${text.replace(/"/g, '&quot;')}">
        <div class="bot-text">${text}</div>
        ${src ? `<span class="src"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>${src}</span>` : ''}
        ${disclaimerHtml}
        <div class="msg-actions">
          <button class="msg-action-btn copy-btn" title="Copier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copier</span>
          </button>
        </div>
      </div>`;
    chatScroll.appendChild(div);
    scrollToBottom();
  }

  // Event Delegation pour les actions Copier et Modifier
  chatScroll.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    const editBtn = e.target.closest('.edit-btn');

    if (copyBtn) {
      const bubble = copyBtn.closest('.msg-bubble');
      const textToCopy = bubble.getAttribute('data-raw-text') || bubble.innerText;
      try {
        await navigator.clipboard.writeText(textToCopy);
        const label = copyBtn.querySelector('span');
        const origText = label.textContent;
        label.textContent = currentLang === 'ar' ? 'تم النسخ!' : 'Copié !';
        setTimeout(() => { label.textContent = origText; }, 1500);
      } catch (err) {
        console.error('Erreur lors de la copie', err);
      }
    }

    if (editBtn) {
      const bubble = editBtn.closest('.msg-bubble');
      const textToEdit = bubble.getAttribute('data-raw-text') || '';
      textField.value = textToEdit;
      textField.focus();
      refreshSendState();
    }
  });

  function pushHistory(icon, title, summary){
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
        <div class="h-top"><h4>${title}</h4><span class="h-date">${time}</span></div>
        <p>${summary}</p>
      </div>`;
    list.prepend(card);
  }

  // ---------- Interaction Worker Cloudflare ----------
  const WORKER_URL = 'https://filaha-ai.dragonetechnology.workers.dev/ask';

  function getDeviceToken(){
    let token = localStorage.getItem('filaha_device_token');
    if (!token){
      token = crypto.randomUUID();
      localStorage.setItem('filaha_device_token', token);
    }
    return token;
  }

  async function askBackend(question, imageBase64){
    const payload = {
      question: question || "",
      deviceToken: getDeviceToken(),
      lang: currentLang
    };

    if (imageBase64) {
      payload.image = imageBase64;
    }

    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const data = await resp.json();
    if (resp.status === 429) throw new Error('RATE_LIMIT');
    if (!resp.ok) throw new Error(data.error || 'ERROR');
    return data;
  }

  async function handleSend(){
    const text = textField.value.trim();
    const imageBase64 = pendingImageBase64;

    if (busy || (!text && !imageBase64)) return;

    busy = true;
    
    // 1. Rendu du message utilisateur (on garde imageBase64 pour le rendu permanent)
    addUserMessage(text, imageBase64);
    
    // 2. Nettoyage de l'interface de saisie
    textField.value = '';
    clearPendingImage();

    // 3. Animation de chargement
    addTyping();

    try {
      const data = await askBackend(text, imageBase64);
      removeTyping();
      
      const srcLabel = data.sources && data.sources.length ? data.sources.join(', ') : null;
      addBotMessage(data.answer, srcLabel);

      const titleText = text || (currentLang === 'ar' ? 'تشخيص بصري' : 'Diagnostic visuel');
      const shortTitle = titleText.length > 34 ? titleText.slice(0, 34) + '…' : titleText;
      const shortSummary = data.answer.length > 70 ? data.answer.slice(0, 70) + '…' : data.answer;
      
      pushHistory(imageBase64 ? 'photo' : 'voice', shortTitle, shortSummary);
    } catch (err) {
      removeTyping();
      const msg = err.message === 'RATE_LIMIT'
        ? (currentLang === 'ar' ? 'عدد كبير جدا من الأسئلة. حاول بعد بضع دقائق.' : 'Trop de questions envoyées. Réessaie dans quelques minutes.')
        : (currentLang === 'ar' ? 'حدث خطأ. حاول مرة أخرى بعد قليل.' : "Une erreur est survenue. Réessaie dans un instant.");
      addBotMessage(msg, null, null, false);
    }
    busy = false;
  }

  sendBtn.addEventListener('click', handleSend);
  textField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Suggestion Chips
  document.getElementById('chipsRow').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || !TRANSLATIONS) return;
    const key = chip.dataset.q;
    const entry = getPath(TRANSLATIONS[currentLang].app, 'knowledge.' + key);
    if (entry && entry.q) {
      textField.value = entry.q;
      handleSend();
    }
  });

  // ---------- Reconnaissance Vocale (Web Speech API) ----------
  function startRecognition(lang){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      micBtn.classList.remove('listening');
      textField.value = transcript;
      handleSend();
    };
    recognition.onerror = (e) => {
      if (lang === 'ar-MA' && e.error === 'language-not-supported') {
        startRecognition('ar-SA');
        return;
      }
      micBtn.classList.remove('listening');
    };
    recognition.onend = () => { micBtn.classList.remove('listening'); };
  }

  micBtn.addEventListener('click', () => {
    if (busy) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { textField.focus(); return; }
    micBtn.classList.add('listening');
    startRecognition(currentLang === 'ar' ? 'ar-MA' : 'fr-FR');
  });

  // ---------- Caméra Live (Modal) ----------
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  let cameraStream = null;

  async function openCamera(){
    try{
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      cameraVideo.srcObject = cameraStream;
      cameraModal.classList.add('open');
    } catch(err) {
      cameraInput.click();
    }
  }

  function closeCamera(){
    if (cameraStream){ cameraStream.getTracks().forEach(tr => tr.stop()); cameraStream = null; }
    cameraModal.classList.remove('open');
  }

  function capturePhoto(){
    const w = cameraVideo.videoWidth, h = cameraVideo.videoHeight;
    if (!w || !h) return;
    cameraCanvas.width = w; cameraCanvas.height = h;
    cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0, w, h);
    
    cameraCanvas.toBlob(blob => {
      closeCamera();
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      processFile(file);
    }, 'image/jpeg', 0.9);
  }

  camBtn.addEventListener('click', () => { if (!busy) openCamera(); });
  document.getElementById('cameraClose').addEventListener('click', closeCamera);
  document.getElementById('cameraShutter').addEventListener('click', capturePhoto);

  // ---------- Historique & Effacement ----------
  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    const list = document.getElementById('historyList');
    list.innerHTML = `
      <div class="h-empty">
        <span class="mark-lg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg></span>
        <p data-i18n="app.history.emptyText">Aucune question pour l'instant. Posez votre première question depuis l'accueil.</p>
      </div>`;
  });

  // ---------- Chargement Traductions ----------
  fetch('translations.json')
    .then(r => r.json())
    .then(data => {
      TRANSLATIONS = data;
      applyLanguage(currentLang);
      addBotMessage(TRANSLATIONS[currentLang].app.chat.welcome, null, 'app.chat.welcome', false);
    })
    .catch(() => {
      addBotMessage("Salam ! Je suis Filaha.AI. Posez-moi une question, parlez, ou envoyez une photo d'une feuille.", null, null, false);
    });
})();
