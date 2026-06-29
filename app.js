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
  let currentPhoto = null;

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

    // Dark premium card
    const bgColor = '#1a1a24';
    const accentColor = '#6366f1';
    const textColor = '#f0f0f5';
    const secondaryText = '#a0a0b0';
    const mutedColor = '#6b6b7b';

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // Subtle radial gradient overlay
    const grad = ctx.createRadialGradient(540, 400, 100, 540, 400, 700);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
    grad.addColorStop(0.6, 'rgba(99, 102, 241, 0.03)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, W, 6);

    // Build4Venezuela watermark top-right
    ctx.fillStyle = mutedColor;
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BUILD4VENEZUELA', W - 50, 50);

    // Photo circle
    const photoSize = 260;
    const photoX = (W - photoSize) / 2;
    const photoY = 110;

    ctx.save();
    drawClipCircle(ctx, W / 2, photoY + photoSize / 2, photoSize / 2);

    if (photoImg) {
      ctx.drawImage(photoImg, photoX, photoY, photoSize, photoSize);
    } else {
      // Fallback: initials with gradient
      const grad2 = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
      grad2.addColorStop(0, '#6366f1');
      grad2.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad2;
      ctx.fillRect(photoX, photoY, photoSize, photoSize);

      const initials = nameInput.value.trim()
        .split(' ')
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 100px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, W / 2, photoY + photoSize / 2 + 4);
    }

    ctx.restore();

    // Photo border circle
    ctx.beginPath();
    ctx.arc(W / 2, photoY + photoSize / 2, photoSize / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Name
    ctx.fillStyle = textColor;
    ctx.font = 'bold 56px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const name = nameInput.value.trim() || 'Nombre completo';
    const maxName = 14;
    const displayName = name.length > maxName ? name.substring(0, maxName) + '...' : name;
    ctx.fillText(displayName, W / 2, photoY + photoSize + 36);

    // Age & Gender line
    const age = ageInput.value.trim();
    const gender = genderInput.value;
    const details = [];
    if (age) details.push(age + ' años');
    if (gender) details.push(gender);
    if (details.length > 0) {
      ctx.fillStyle = secondaryText;
      ctx.font = '500 26px "Inter", sans-serif';
      ctx.fillText(details.join(' · '), W / 2, photoY + photoSize + 102);
    }

    // Location
    const loc = locationInput.value.trim();
    if (loc) {
      ctx.fillStyle = secondaryText;
      ctx.font = '500 24px "Inter", sans-serif';
      const maxLoc = 30;
      const displayLoc = loc.length > maxLoc ? loc.substring(0, maxLoc) + '...' : loc;
      // Location icon
      ctx.fillText('📍 ' + displayLoc, W / 2, photoY + photoSize + 148);
    }

    // Divider line
    const dividerY = photoY + photoSize + 200;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(160, dividerY);
    ctx.lineTo(W - 160, dividerY);
    ctx.stroke();

    // Contact label + value
    ctx.fillStyle = mutedColor;
    ctx.font = '500 20px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CONTACTO', 160, dividerY + 32);

    const contact = contactInput.value.trim() || 'Sin contacto';
    ctx.fillStyle = textColor;
    ctx.font = '600 28px "Inter", sans-serif';
    ctx.fillText(contact, 160, dividerY + 68);

    // Description
    const desc = descInput.value.trim();
    if (desc) {
      ctx.fillStyle = secondaryText;
      ctx.font = '500 22px "Inter", sans-serif';
      ctx.textAlign = 'left';
      wrapText(ctx, desc, 160, dividerY + 120, 760, 34);
    }

    // Bottom accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, H - 6, W, 6);

    // Footer text
    ctx.fillStyle = mutedColor;
    ctx.font = '400 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('build4venezuela.com · Comparte esta ficha', W / 2, H - 48);

    // QR-like decorative element bottom-right
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
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
