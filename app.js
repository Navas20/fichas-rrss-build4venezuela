/* ==========================================
   Fichas RRSS - Build4Venezuela
   Canvas rendering + form logic + clipboard
   ========================================== */

(function () {
  'use strict';

  /* ---------- DOM refs ---------- */
  const $ = (id) => document.getElementById(id);

  const form = $('cardForm');
  const photoInput = $('photoInput');
  const photoPlaceholder = $('photoPlaceholder');
  const photoPreview = $('photoPreview');
  const photoUpload = document.querySelector('.photo-upload');
  const nameInput = $('nameInput');
  const ageInput = $('ageInput');
  const genderInput = $('genderInput');
  const locationInput = $('locationInput');
  const contactInput = $('contactInput');
  const descInput = $('descInput');
  const generateBtn = $('generateBtn');
  const canvas = $('cardCanvas');
  const ctx = canvas.getContext('2d');
  const cardLoading = $('cardLoading');
  const cardContainer = $('cardContainer');
  const actionsContainer = $('actionsContainer');
  const downloadBtn = $('downloadBtn');
  const copyBtn = $('copyBtn');
  const resetBtn = $('resetBtn');
  const toast = $('toast');
  const themeToggle = $('themeToggle');

  const nameError = $('nameError');
  const contactError = $('contactError');
  const photoError = $('photoError');

  /* ---------- State ---------- */
  const STORAGE_KEY = 'fichas-rrss-data';
  const TEMPLATE_KEY = 'fichas-rrss-template';
  let currentPhoto = null;

  /* ---------- Templates ---------- */
  const TEMPLATES = {
    dark: {
      bg: '#1a1a24', accent: '#6366f1', text: '#f0f0f5',
      secondary: '#a0a0b0', muted: '#6b6b7b',
      gradFrom: '#6366f1', gradTo: '#8b5cf6',
      divider: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.12)',
      glow: 'rgba(99,102,241,0.08)',
    },
    light: {
      bg: '#ffffff', accent: '#4f46e5', text: '#1a1a2e',
      secondary: '#555570', muted: '#9999aa',
      gradFrom: '#4f46e5', gradTo: '#7c3aed',
      divider: 'rgba(0,0,0,0.08)',
      border: 'rgba(0,0,0,0.12)',
      glow: 'rgba(79,70,229,0.06)',
    },
    warm: {
      bg: '#1c1510', accent: '#f59e0b', text: '#fdf8f0',
      secondary: '#d4a574', muted: '#8a6e4e',
      gradFrom: '#f59e0b', gradTo: '#ef4444',
      divider: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.12)',
      glow: 'rgba(245,158,11,0.08)',
    },
    ocean: {
      bg: '#0f1a1e', accent: '#06b6d4', text: '#ecfeff',
      secondary: '#67e8f9', muted: '#4a8a94',
      gradFrom: '#06b6d4', gradTo: '#3b82f6',
      divider: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.12)',
      glow: 'rgba(6,182,212,0.08)',
    },
  };

  function getCurrentTemplate() {
    return document.querySelector('.template-option[aria-checked="true"]')?.getAttribute('data-template') || 'dark';
  }

  function setTemplate(name) {
    const opts = document.querySelectorAll('.template-option');
    opts.forEach(el => {
      const isChecked = el.getAttribute('data-template') === name;
      el.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    });
    try { localStorage.setItem(TEMPLATE_KEY, name); } catch (_) {}
  }

  function initTemplate() {
    const saved = localStorage.getItem(TEMPLATE_KEY) || 'dark';
    setTemplate(saved);
  }

  document.querySelectorAll('.template-option').forEach(el => {
    el.addEventListener('click', function () {
      const name = this.getAttribute('data-template');
      setTemplate(name);
      if (hasRequiredFields()) generateCard();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });

  /* ---------- Persistence ---------- */
  function saveState() {
    const data = {
      name: nameInput.value,
      age: ageInput.value,
      gender: genderInput.value,
      location: locationInput.value,
      contact: contactInput.value,
      desc: descInput.value,
      hasPhoto: currentPhoto !== null,
      template: getCurrentTemplate(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      nameInput.value = data.name || '';
      ageInput.value = data.age || '';
      genderInput.value = data.gender || '';
      locationInput.value = data.location || '';
      contactInput.value = data.contact || '';
      descInput.value = data.desc || '';
      if (data.template) setTemplate(data.template);
      if (data.hasPhoto) {
        showToast('La foto no se conserva al recargar. Vuelve a subirla para generar la ficha.', '');
        if (hasRequiredFields()) actionsContainer.hidden = false;
      }
    } catch (_) {}
  }

  /* ---------- Theme ---------- */
  function getPreferredTheme() {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.innerHTML = theme === 'dark'
      ? '<span class="theme-icon" aria-hidden="true">&#9789;</span>'
      : '<span class="theme-icon" aria-hidden="true">&#9788;</span>';
    try { localStorage.setItem('fichas-rrss-theme', theme); } catch (_) {}
  }

  function initTheme() {
    const saved = localStorage.getItem('fichas-rrss-theme');
    setTheme(saved || getPreferredTheme());
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('fichas-rrss-theme')) {
      setTheme(e.matches ? 'light' : 'dark');
    }
  });

  /* ---------- Toast ---------- */
  let toastTimeout = null;

  function showToast(message, type) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = 'toast ' + (type || '');
    toast.classList.remove('hidden');
    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  /* ---------- Photo handling ---------- */
  function loadPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError(photoError, 'Solo se permiten imágenes (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(photoError, 'La imagen debe pesar menos de 5 MB');
      return;
    }
    clearError(photoError);

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        currentPhoto = img;
        showPhotoPreview(img);
        saveState();
        if (hasRequiredFields()) generateCard();
      };
      img.onerror = function () {
        showError(photoError, 'No se pudo cargar la imagen');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showPhotoPreview(img) {
    photoPlaceholder.classList.add('hidden');
    photoPreview.classList.remove('hidden');
    photoPreview.src = img.src;
    photoPreview.alt = 'Foto de la persona';
  }

  function resetPhoto() {
    currentPhoto = null;
    photoPreview.classList.add('hidden');
    photoPlaceholder.classList.remove('hidden');
    photoPreview.src = '';
    photoInput.value = '';
    clearError(photoError);
  }

  photoInput.addEventListener('change', function () {
    if (this.files && this.files[0]) loadPhoto(this.files[0]);
  });

  /* Drag and drop */
  photoUpload.addEventListener('click', function () {
    photoInput.click();
  });

  photoUpload.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      photoInput.click();
    }
  });

  photoUpload.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.classList.add('dragover');
  });

  photoUpload.addEventListener('dragleave', function () {
    this.classList.remove('dragover');
  });

  photoUpload.addEventListener('drop', function (e) {
    e.preventDefault();
    this.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadPhoto(e.dataTransfer.files[0]);
    }
  });

  /* ---------- Validation ---------- */
  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function clearError(el) {
    el.textContent = '';
    el.classList.add('hidden');
  }

  function hasRequiredFields() {
    let valid = true;
    if (!nameInput.value.trim()) {
      showError(nameError, 'El nombre es obligatorio');
      nameInput.classList.add('error');
      valid = false;
    } else {
      clearError(nameError);
      nameInput.classList.remove('error');
    }
    if (!contactInput.value.trim()) {
      showError(contactError, 'El contacto es obligatorio');
      contactInput.classList.add('error');
      valid = false;
    } else {
      clearError(contactError);
      contactInput.classList.remove('error');
    }
    return valid;
  }

  /* ---------- Canvas rendering ---------- */
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line ? line + ' ' + words[i] : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
    return lines.length;
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawClipCircle(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  function renderCard(photoImg) {
    const W = 1080;
    const H = 1080;
    const tpl = TEMPLATES[getCurrentTemplate()] || TEMPLATES.dark;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = tpl.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle radial gradient overlay
    const grad = ctx.createRadialGradient(540, 400, 100, 540, 400, 700);
    grad.addColorStop(0, tpl.glow);
    grad.addColorStop(0.6, tpl.glow.replace('0.08', '0.03').replace('0.06', '0.02'));
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    ctx.fillStyle = tpl.accent;
    ctx.fillRect(0, 0, W, 6);

    // Watermark top-right
    ctx.fillStyle = tpl.muted;
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BUILD4VENEZUELA', W - 50, 50);

    // Photo
    const photoSize = 260;
    const photoX = (W - photoSize) / 2;
    const photoY = 110;

    ctx.save();
    drawClipCircle(ctx, W / 2, photoY + photoSize / 2, photoSize / 2);

    if (photoImg) {
      ctx.drawImage(photoImg, photoX, photoY, photoSize, photoSize);
    } else {
      const g2 = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
      g2.addColorStop(0, tpl.gradFrom);
      g2.addColorStop(1, tpl.gradTo);
      ctx.fillStyle = g2;
      ctx.fillRect(photoX, photoY, photoSize, photoSize);

      const initials = nameInput.value.trim()
        .split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 100px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, W / 2, photoY + photoSize / 2 + 4);
    }
    ctx.restore();

    // Photo border
    ctx.beginPath();
    ctx.arc(W / 2, photoY + photoSize / 2, photoSize / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = tpl.border;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Name
    ctx.fillStyle = tpl.text;
    ctx.font = 'bold 56px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const name = nameInput.value.trim() || 'Nombre completo';
    const displayName = name.length > 14 ? name.substring(0, 14) + '...' : name;
    ctx.fillText(displayName, W / 2, photoY + photoSize + 36);

    // Age & Gender
    const age = ageInput.value.trim();
    const gender = genderInput.value;
    const details = [];
    if (age) details.push(age + ' años');
    if (gender) details.push(gender);
    if (details.length > 0) {
      ctx.fillStyle = tpl.secondary;
      ctx.font = '500 26px "Inter", sans-serif';
      ctx.fillText(details.join(' · '), W / 2, photoY + photoSize + 102);
    }

    // Location
    const loc = locationInput.value.trim();
    if (loc) {
      ctx.fillStyle = tpl.secondary;
      ctx.font = '500 24px "Inter", sans-serif';
      const displayLoc = loc.length > 30 ? loc.substring(0, 30) + '...' : loc;
      ctx.fillText('\uD83D\uDCCD ' + displayLoc, W / 2, photoY + photoSize + 148);
    }

    // Divider
    const dividerY = photoY + photoSize + 200;
    ctx.strokeStyle = tpl.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(160, dividerY);
    ctx.lineTo(W - 160, dividerY);
    ctx.stroke();

    // Contact
    ctx.fillStyle = tpl.muted;
    ctx.font = '500 20px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CONTACTO', 160, dividerY + 32);
    const contact = contactInput.value.trim() || 'Sin contacto';
    ctx.fillStyle = tpl.text;
    ctx.font = '600 28px "Inter", sans-serif';
    ctx.fillText(contact, 160, dividerY + 68);

    // Description
    const desc = descInput.value.trim();
    if (desc) {
      ctx.fillStyle = tpl.secondary;
      ctx.font = '500 22px "Inter", sans-serif';
      ctx.textAlign = 'left';
      wrapText(ctx, desc, 160, dividerY + 120, 760, 34);
    }

    // Bottom accent
    ctx.fillStyle = tpl.accent;
    ctx.fillRect(0, H - 6, W, 6);

    // Footer
    ctx.fillStyle = tpl.muted;
    ctx.font = '400 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('build4venezuela.com \u00B7 Comparte esta ficha', W / 2, H - 48);

    // Corner mark
    ctx.fillStyle = tpl.glow;
    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('B4V', W - 50, H - 48);
  }

  function generateCard() {
    showLoading(true);

    const doRender = () => {
      requestAnimationFrame(() => {
        renderCard(currentPhoto);
        showLoading(false);

        // Trigger animations
        cardContainer.classList.remove('card-fade-in');
        void cardContainer.offsetWidth;
        cardContainer.classList.add('card-fade-in');

        actionsContainer.classList.remove('actions-fade-in');
        void actionsContainer.offsetWidth;
        actionsContainer.classList.add('actions-fade-in');
        actionsContainer.hidden = false;

        downloadBtn.focus();
        saveState();
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(doRender).catch(doRender);
    } else {
      setTimeout(doRender, 100);
    }
  }

  function showLoading(show) {
    cardLoading.classList.toggle('hidden', !show);
    cardContainer.classList.toggle('hidden', show);
  }

  /* ---------- Export ---------- */
  function downloadPNG() {
    const link = document.createElement('a');
    const name = (nameInput.value.trim() || 'ficha').replace(/\s+/g, '_').toLowerCase();
    link.download = `ficha_${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Ficha descargada', 'success');
  }

  async function copyImage() {
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('No se pudo generar la imagen');
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('Imagen copiada al portapapeles', 'success');
    } catch (err) {
      // Fallback: try to copy as text
      try {
        await navigator.clipboard.writeText(
          `🔍 BUSCO A ${nameInput.value.trim().toUpperCase()}\n` +
          (ageInput.value ? `Edad: ${ageInput.value}\n` : '') +
          (locationInput.value ? `📍 ${locationInput.value}\n` : '') +
          `📞 Contacto: ${contactInput.value}\n\n` +
          `Generado en build4venezuela.com/fichas`
        );
        showToast('Texto copiado (la imagen no se pudo copiar directamente)', 'success');
      } catch (_) {
        showToast('No se pudo copiar. Usa "Descargar PNG"', 'error');
      }
    }
  }

  /* ---------- Reset ---------- */
  function resetForm() {
    form.reset();
    resetPhoto();
    actionsContainer.hidden = true;
    currentPhoto = null;
    clearError(nameError);
    clearError(contactError);
    nameInput.classList.remove('error');
    contactInput.classList.remove('error');
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    showToast('Formulario reiniciado', 'success');
  }

  /* ---------- Event listeners ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (hasRequiredFields()) {
      generateCard();
    } else {
      showToast('Completa los campos obligatorios', 'error');
    }
  });

  downloadBtn.addEventListener('click', downloadPNG);
  copyBtn.addEventListener('click', copyImage);
  resetBtn.addEventListener('click', resetForm);

  /* Clear field errors on input */
  nameInput.addEventListener('input', function () {
    if (this.value.trim()) {
      clearError(nameError);
      this.classList.remove('error');
    }
  });

  contactInput.addEventListener('input', function () {
    if (this.value.trim()) {
      clearError(contactError);
      this.classList.remove('error');
    }
  });

  /* Auto-save on input */
  [nameInput, ageInput, genderInput, locationInput, contactInput, descInput].forEach(el => {
    el.addEventListener('input', saveState);
    el.addEventListener('change', saveState);
  });

  /* ---------- Init ---------- */
  initTheme();

  function initApp() {
    restoreState();

    if (!localStorage.getItem(STORAGE_KEY)) {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => renderCard(null)).catch(() => renderCard(null));
      } else {
        renderCard(null);
      }
    }
  }

  requestAnimationFrame(initApp);

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

})();
