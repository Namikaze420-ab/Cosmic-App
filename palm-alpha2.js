(() => {
  const originalRenderInsights = renderInsights;
  const originalEnterApp = enterApp;
  const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const MAX_BYTES = 10 * 1024 * 1024;

  state.palmReadings = state.palmReadings || [];

  function readableSize(bytes) {
    if (!Number.isFinite(bytes)) return '';
    return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
  }

  async function loadPalmReadings() {
    if (state.mode !== 'live' || !state.user || !sb) {
      state.palmReadings = [];
      return [];
    }

    const { data, error } = await sb
      .from('palm_readings')
      .select('id,storage_path,status,created_at,completed_at,model_version')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Palm reading list failed', error.message);
      state.palmReadings = [];
      return [];
    }

    state.palmReadings = data || [];
    if (state.page === 'insights') renderInsights();
    return state.palmReadings;
  }

  function statusCopy(row) {
    if (row.status === 'complete') return 'Reading complete';
    if (row.status === 'processing') return 'Processing';
    if (row.status === 'failed') return 'Processing failed';
    return 'Private upload stored · AI analysis not enabled yet';
  }

  function filename(path = '') {
    return path.split('/').pop() || 'Palm image';
  }

  function renderPalmFoundation() {
    const page = document.querySelector('#page-insights');
    if (!page || document.querySelector('#palmAlpha2Section')) return;

    const section = document.createElement('section');
    section.id = 'palmAlpha2Section';
    section.className = 'card';
    section.style.marginTop = '18px';
    section.style.padding = '23px';

    if (state.mode === 'demo') {
      section.innerHTML = `
        <span class="eyebrow">PALMISTRY · PRIVATE FOUNDATION</span>
        <h2 style="margin:7px 0 10px">No palm image is stored in demo mode.</h2>
        <p class="module-copy">Sign in to upload a JPEG, PNG or WebP image to your private Supabase Storage folder. AI interpretation is intentionally disabled until the opt-in processing flow passes privacy review.</p>`;
      page.appendChild(section);
      return;
    }

    const items = (state.palmReadings || []).map((row) => `
      <div class="status-row" data-palm-id="${esc(row.id)}">
        <span><b style="display:block">${esc(filename(row.storage_path))}</b><small>${esc(statusCopy(row))}</small></span>
        <button class="task-mini" type="button" data-delete-palm="${esc(row.id)}">Delete</button>
      </div>`).join('');

    section.innerHTML = `
      <span class="eyebrow">PALMISTRY · PRIVATE FOUNDATION</span>
      <h2 style="margin:7px 0 10px">Private upload, explicit processing later.</h2>
      <p class="module-copy">Images are stored in a private bucket under your user ID. Uploading does not consent to AI analysis; no model processes the image in this Alpha stage.</p>
      <div style="display:grid;gap:10px;margin-top:14px">
        <label class="field"><span>Palm image</span><input id="palmFileInput" type="file" accept="image/jpeg,image/png,image/webp"></label>
        <div class="auth-note">JPEG, PNG or WebP · maximum 10 MB</div>
        <button id="uploadPalmBtn" class="ghost-btn" type="button">Upload privately</button>
        <div id="palmUploadStatus" class="auth-msg" aria-live="polite"></div>
      </div>
      <div class="settings-section" style="margin-top:18px">
        <h3>Your private uploads</h3>
        <div id="palmUploadList" class="status-list">${items || '<div class="status-row"><span>No palm images uploaded</span><b>Private</b></div>'}</div>
      </div>`;

    section.querySelector('#uploadPalmBtn').onclick = uploadPalm;
    section.querySelectorAll('[data-delete-palm]').forEach((button) => {
      button.onclick = () => deletePalm(button.dataset.deletePalm);
    });
    page.appendChild(section);
  }

  async function uploadPalm() {
    if (state.mode !== 'live' || !state.user || !sb) return;
    const input = document.querySelector('#palmFileInput');
    const status = document.querySelector('#palmUploadStatus');
    const button = document.querySelector('#uploadPalmBtn');
    const file = input?.files?.[0];

    if (!file) {
      status.textContent = 'Choose a palm image first.';
      return;
    }
    if (!ACCEPTED_TYPES.has(file.type)) {
      status.textContent = 'Use a JPEG, PNG or WebP image.';
      return;
    }
    if (file.size > MAX_BYTES) {
      status.textContent = `Image is ${readableSize(file.size)}. Maximum size is 10 MB.`;
      return;
    }

    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
    const path = `${state.user.id}/${crypto.randomUUID()}.${extension}`;
    button.disabled = true;
    input.disabled = true;
    status.textContent = 'Uploading to private storage…';

    try {
      const { error: uploadError } = await sb.storage
        .from('palm-uploads')
        .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '0' });
      if (uploadError) throw uploadError;

      const { data: reading, error: rowError } = await sb
        .from('palm_readings')
        .insert({ user_id: state.user.id, storage_path: path, status: 'uploaded' })
        .select('id,storage_path,status,created_at,completed_at,model_version')
        .single();

      if (rowError) {
        await sb.storage.from('palm-uploads').remove([path]);
        throw rowError;
      }

      state.palmReadings = [reading, ...(state.palmReadings || [])];
      input.value = '';
      // renderInsights replaces this entire section. Re-query the live status node
      // after rendering so assistive/live status and visible feedback are not lost.
      renderInsights();
      const liveStatus = document.querySelector('#palmUploadStatus');
      if (liveStatus) liveStatus.textContent = 'Private upload complete. No AI processing was triggered.';
      toast('Palm image stored privately');
    } catch (error) {
      const liveStatus = document.querySelector('#palmUploadStatus') || status;
      liveStatus.textContent = error?.message || 'Palm image upload failed.';
    } finally {
      const liveButton = document.querySelector('#uploadPalmBtn');
      const liveInput = document.querySelector('#palmFileInput');
      if (liveButton) liveButton.disabled = false;
      if (liveInput) liveInput.disabled = false;
    }
  }

  async function deletePalm(id) {
    if (state.mode !== 'live' || !state.user || !sb) return;
    const row = (state.palmReadings || []).find((item) => item.id === id);
    if (!row) return;

    const button = document.querySelector(`[data-delete-palm="${CSS.escape(id)}"]`);
    if (button) button.disabled = true;

    try {
      const { error: storageError } = await sb.storage.from('palm-uploads').remove([row.storage_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await sb.from('palm_readings').delete().eq('id', id).eq('user_id', state.user.id);
      if (rowError) throw rowError;
      state.palmReadings = state.palmReadings.filter((item) => item.id !== id);
      renderInsights();
      toast('Private palm image deleted');
    } catch (error) {
      toast(error?.message || 'Palm image deletion failed');
      if (button) button.disabled = false;
    }
  }

  renderInsights = function alpha2PalmRenderInsights() {
    originalRenderInsights();
    renderPalmFoundation();
  };

  enterApp = function alpha2PalmEnterApp() {
    originalEnterApp();
    void loadPalmReadings();
  };

  window.CosmicPalm = Object.freeze({
    load: loadPalmReadings,
    upload: uploadPalm,
    remove: deletePalm,
    acceptedTypes: [...ACCEPTED_TYPES],
    maxBytes: MAX_BYTES,
  });
})();
