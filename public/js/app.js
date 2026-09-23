// =========================================================================
// PUBLIC/JS/APP.JS - Main Frontend Application Logic & API Dispatcher
// =========================================================================
// Yeh file Drag & Drop events, Server API calls, Gallery rendering, 
// Toast notifications, aur Clipboard copy functionality ko connect karti hai.

document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------
  // GLOBAL STATE VARIABLES
  // ------------------------------------------
  let currentStorageMode = 'cloud'; // Default Mode: 'cloud' (ImgBB Free Cloud API)
  let allImagesList = [];           // Server se aayi sabhi images ka array
  let currentFileToUpload = null;   // Active selected image file
  let currentFilter = 'all';        // Active filter badge
  let currentSort = 'newest';       // Active sort option

  // ------------------------------------------
  // DOM ELEMENT REFERENCES
  // ------------------------------------------
  const dropzoneArea = document.getElementById('dropzoneArea');
  const fileInput = document.getElementById('fileInput');
  const btnBrowseFiles = document.getElementById('btnBrowseFiles');
  
  const btnModeCloud = document.getElementById('btnModeCloud');
  const btnModeLocal = document.getElementById('btnModeLocal');
  const badgeCurrentMode = document.getElementById('badgeCurrentMode');

  const btnSaveAndUpload = document.getElementById('btnSaveAndUpload');
  const selectFormat = document.getElementById('selectFormat');
  const rangeQuality = document.getElementById('rangeQuality');

  const uploadProgressContainer = document.getElementById('uploadProgressContainer');
  const uploadProgressBar = document.getElementById('uploadProgressBar');
  const uploadStatusText = document.getElementById('uploadStatusText');
  const uploadPercentText = document.getElementById('uploadPercentText');

  const galleryContainer = document.getElementById('galleryContainer');
  const textImageCount = document.getElementById('textImageCount');
  const textTotalUsage = document.getElementById('textTotalUsage');
  const barUsageFill = document.getElementById('barUsageFill');
  const badgeDbStatus = document.getElementById('badgeDbStatus');

  const inputSearch = document.getElementById('inputSearch');
  const selectSort = document.getElementById('selectSort');

  // Embed Modal Elements
  const embedModal = document.getElementById('embedModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const modalPreviewImg = document.getElementById('modalPreviewImg');
  const inputDirectUrl = document.getElementById('inputDirectUrl');
  const inputHtmlEmbed = document.getElementById('inputHtmlEmbed');
  const inputMarkdownEmbed = document.getElementById('inputMarkdownEmbed');

  // ==========================================
  // 1. STORAGE TARGET TOGGLE SWITCH (Cloud ↔️ Local)
  // ==========================================
  btnModeCloud.addEventListener('click', () => setStorageMode('cloud'));
  btnModeLocal.addEventListener('click', () => setStorageMode('local'));

  function setStorageMode(mode) {
    currentStorageMode = mode;
    if (mode === 'cloud') {
      btnModeCloud.classList.add('active');
      btnModeLocal.classList.remove('active');
      badgeCurrentMode.textContent = '🌐 Free Cloud Mode (Worldwide Link)';
      badgeCurrentMode.style.color = 'var(--color-cyan)';
    } else {
      btnModeLocal.classList.add('active');
      btnModeCloud.classList.remove('active');
      badgeCurrentMode.textContent = '💻 Local Computer Storage Mode';
      badgeCurrentMode.style.color = 'var(--color-indigo)';
    }
  }

  // ==========================================
  // 2. DRAG & DROP FILE SELECTION HANDLERS
  // ==========================================
  btnBrowseFiles.addEventListener('click', () => fileInput.click());

  let selectedBatchFilesQueue = []; // Multiple files batch list

  // Batch Queue UI Elements
  const batchQueueContainer = document.getElementById('batchQueueContainer');
  const batchQueueTitle = document.getElementById('batchQueueTitle');
  const batchFilesList = document.getElementById('batchFilesList');
  const btnUploadBatchAll = document.getElementById('btnUploadBatchAll');

  // ==========================================
  // 2. DRAG & DROP FILE SELECTION HANDLERS (SINGLE & MULTIPLE)
  // ==========================================
  btnBrowseFiles.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  });

  // Drag over effects
  dropzoneArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneArea.classList.add('dragover');
  });

  dropzoneArea.addEventListener('dragleave', () => {
    dropzoneArea.classList.remove('dragover');
  });

  dropzoneArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneArea.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  });

  function handleFilesSelected(files) {
    const validImages = files.filter(f => f.type && f.type.startsWith('image/'));
    
    if (validImages.length === 0) {
      showToast('Kripya sirf valid image files (PNG, JPG, WEBP) select karein!', 'error');
      return;
    }

    // Append to batch list
    selectedBatchFilesQueue = [...selectedBatchFilesQueue, ...validImages];

    // Load first/active file into Editor Canvas
    currentFileToUpload = selectedBatchFilesQueue[0];
    initImageEditor(currentFileToUpload);

    renderBatchQueueList();

    if (validImages.length === 1) {
      showToast(`"${validImages[0].name}" select ho gayi hai. Editor se crop & compress karein!`, 'info');
    } else {
      showToast(`${validImages.length} images batch queue mein add ho gayi hain!`, 'success');
    }
  }

  function renderBatchQueueList() {
    if (selectedBatchFilesQueue.length <= 1) {
      batchQueueContainer.classList.add('hidden');
      return;
    }

    batchQueueContainer.classList.remove('hidden');
    batchQueueTitle.innerHTML = `<i class="fa-solid fa-layer-group icon-neon"></i> Selected Files Batch (${selectedBatchFilesQueue.length})`;
    btnUploadBatchAll.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload All (${selectedBatchFilesQueue.length} Files)`;

    batchFilesList.innerHTML = selectedBatchFilesQueue.map((file, idx) => {
      const isCurrent = file === currentFileToUpload;
      const objectUrl = URL.createObjectURL(file);
      return `
        <div class="batch-file-item ${isCurrent ? 'active-editing' : ''}" data-idx="${idx}">
          <div class="batch-item-left" style="cursor: pointer;" onclick="selectFileFromBatch(${idx})">
            <img src="${objectUrl}" class="batch-thumb" alt="thumb">
            <div>
              <div class="batch-file-name" title="${file.name}">${file.name}</div>
              <div class="batch-file-size">${formatBytes(file.size)}</div>
            </div>
          </div>
          <div class="batch-item-actions">
            <button type="button" class="btn-sm btn-primary" onclick="selectFileFromBatch(${idx})">
              ${isCurrent ? 'Editing...' : 'Edit / Crop'}
            </button>
            <button type="button" class="btn-remove-batch" onclick="removeBatchItem(${idx})" title="Remove">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.selectFileFromBatch = function(idx) {
    if (selectedBatchFilesQueue[idx]) {
      currentFileToUpload = selectedBatchFilesQueue[idx];
      initImageEditor(currentFileToUpload);
      renderBatchQueueList();
    }
  };

  window.removeBatchItem = function(idx) {
    selectedBatchFilesQueue.splice(idx, 1);
    if (selectedBatchFilesQueue.length > 0) {
      currentFileToUpload = selectedBatchFilesQueue[0];
      initImageEditor(currentFileToUpload);
    }
    renderBatchQueueList();
  };

  // ==========================================
  // BATCH UPLOAD ALL IMAGES DISPATCHER
  // ==========================================
  btnUploadBatchAll.addEventListener('click', async () => {
    if (selectedBatchFilesQueue.length === 0) return;

    const totalCount = selectedBatchFilesQueue.length;
    uploadProgressContainer.classList.remove('hidden');
    let successCount = 0;

    for (let i = 0; i < totalCount; i++) {
      const file = selectedBatchFilesQueue[i];
      const progressPercent = Math.round(((i + 1) / totalCount) * 100);
      setUploadProgress(progressPercent, `Uploading file ${i + 1} of ${totalCount}: "${file.name}"...`);

      try {
        const formData = new FormData();
        formData.append('image', file, file.name);
        formData.append('storageType', currentStorageMode);
        formData.append('format', selectFormat.value);
        formData.append('quality', rangeQuality.value);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const resData = await response.json();
        if (resData.success) successCount++;
      } catch (err) {
        console.error(`Batch upload error for ${file.name}:`, err);
      }
    }

    setUploadProgress(100, `Batch upload completed! (${successCount}/${totalCount} success)`);
    showToast(`${successCount} of ${totalCount} images batch upload ho gayi hain!`, 'success');

    selectedBatchFilesQueue = [];
    renderBatchQueueList();
    fetchImagesList();
    fetchStorageStats();

    setTimeout(() => {
      uploadProgressContainer.classList.add('hidden');
    }, 2000);
  });

  // ==========================================
  // 3. PROCESS & UPLOAD API DISPATCHER
  // ==========================================
  btnSaveAndUpload.addEventListener('click', async () => {
    if (!currentFileToUpload) {
      showToast('Pehle koi file select ya drop karein.', 'error');
      return;
    }

    try {
      // Progress Bar dikhao
      uploadProgressContainer.classList.remove('hidden');
      setUploadProgress(15, 'Image canvas se crop aur compress ho rahi hai...');

      const targetFormat = selectFormat.value; // 'webp', 'png', 'jpeg'
      const qualityVal = parseInt(rangeQuality.value, 10); // 10-100%
      const formatMime = `image/${targetFormat === 'jpeg' ? 'jpeg' : targetFormat}`;

      // Custom Name input read kar rahe hain
      const inputCustomFileName = document.getElementById('inputCustomFileName');
      const customNameVal = inputCustomFileName ? inputCustomFileName.value.trim() : '';

      // Editor.js se cropped Blob nikaalo
      const croppedBlob = await getCroppedCanvasBlob(formatMime, qualityVal / 100);

      setUploadProgress(45, `${currentStorageMode === 'cloud' ? '🌐 ImgBB Cloud API' : '💻 Local Server'} par submit ho rahi hai...`);

      // Read security, album & filter elements
      const selectAlbumFolder = document.getElementById('selectAlbumFolder');
      const inputLinkPassword = document.getElementById('inputLinkPassword');
      const selectLinkExpiry = document.getElementById('selectLinkExpiry');
      const selectFilterPreset = document.getElementById('selectFilterPreset');
      const inputWatermarkText = document.getElementById('inputWatermarkText');

      // Multipart FormData prepare kar rahe hain
      const formData = new FormData();
      formData.append('image', croppedBlob, currentFileToUpload.name);
      formData.append('storageType', currentStorageMode);
      formData.append('format', targetFormat);
      formData.append('quality', qualityVal);
      if (customNameVal) formData.append('customName', customNameVal);
      if (selectAlbumFolder) formData.append('album', selectAlbumFolder.value);
      if (inputLinkPassword && inputLinkPassword.value.trim()) formData.append('password', inputLinkPassword.value.trim());
      if (selectLinkExpiry) formData.append('expiryDays', selectLinkExpiry.value);
      if (selectFilterPreset) formData.append('filterPreset', selectFilterPreset.value);
      if (inputWatermarkText && inputWatermarkText.value.trim()) formData.append('watermarkText', inputWatermarkText.value.trim());

      setUploadProgress(70, 'Server response ka wait chal raha hai...');

      // Fetch POST Request to Express Backend API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100, 'Upload complete ho gaya!');
        showToast(result.message, 'success');

        // Gallery aur Stats refresh karo
        fetchImagesList();
        fetchStorageStats();

        // Embed Modal Auto-Open Karo
        openEmbedModal(result.image);
      } else {
        throw new Error(result.message || 'Upload process fail ho gaya.');
      }

    } catch (error) {
      console.error('Upload Error:', error);
      showToast(`Upload Error: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        uploadProgressContainer.classList.add('hidden');
      }, 1500);
    }
  });

  function setUploadProgress(percent, text) {
    uploadProgressBar.style.width = `${percent}%`;
    uploadPercentText.textContent = `${percent}%`;
    uploadStatusText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
  }

  // ==========================================
  // 4. GALLERY FETCH & RENDERER
  // ==========================================
  async function fetchImagesList() {
    try {
      const res = await fetch('/api/images');
      const data = await res.json();
      if (data.success) {
        allImagesList = data.images;
        renderGallery();
      }
    } catch (err) {
      console.error('Fetch Images Error:', err);
    }
  }

  function renderGallery() {
    let list = [...allImagesList];

    // 1. Search Filter Apply Karo
    const query = inputSearch.value.trim().toLowerCase();
    if (query) {
      list = list.filter(img => img.originalName.toLowerCase().includes(query) || img.fileName.toLowerCase().includes(query));
    }

    // 2. Storage & Format Pill Filter Apply Karo
    if (currentFilter === 'cloud') {
      list = list.filter(img => img.storageType === 'cloud');
    } else if (currentFilter === 'local') {
      list = list.filter(img => img.storageType === 'local');
    } else if (currentFilter === 'webp') {
      list = list.filter(img => img.mimeType.includes('webp'));
    }

    // 3. Sorting Apply Karo
    if (currentSort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (currentSort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (currentSort === 'size-desc') {
      list.sort((a, b) => b.fileSize - a.fileSize);
    } else if (currentSort === 'size-asc') {
      list.sort((a, b) => a.fileSize - b.fileSize);
    }

    textImageCount.textContent = `${list.length} Items`;

    if (list.length === 0) {
      galleryContainer.innerHTML = `
        <div class="empty-gallery-state">
          <div class="empty-icon"><i class="fa-solid fa-images"></i></div>
          <h3>Koi Image nahi mili</h3>
          <p>Search query ya filter match nahi hua.</p>
        </div>
      `;
      return;
    }

    // Glass Cards HTML Generation
    galleryContainer.innerHTML = list.map(img => {
      const publicUrl = img.cloudUrl || img.localPath || `/uploads/${img.fileName}`;
      const isCloud = img.storageType === 'cloud';
      const formattedSize = formatBytes(img.fileSize);
      const dimensions = (img.dimensions && img.dimensions.width) 
        ? `${img.dimensions.width}x${img.dimensions.height}px` 
        : 'Auto';

      return `
        <div class="image-card" data-id="${img.id}">
          <div class="card-img-wrapper">
            <img src="${publicUrl}" alt="${img.originalName}" loading="lazy">
            <span class="badge-storage-tag ${isCloud ? 'cloud' : 'local'}">
              ${isCloud ? '🌐 Cloud' : '💻 Local'}
            </span>
          </div>

          <div class="card-body">
            <div class="card-title" title="${img.originalName}">${img.originalName}</div>
            
            <div class="card-meta-row">
              <span><i class="fa-solid fa-hard-drive"></i> ${formattedSize}</span>
              <span><i class="fa-solid fa-expand"></i> ${dimensions}</span>
            </div>

            <div class="card-actions">
              <button class="btn-card-action btn-copy-url" data-url="${publicUrl}">
                <i class="fa-solid fa-link"></i> Link
              </button>
              <button class="btn-card-action btn-open-embed" data-id="${img.id}">
                <i class="fa-solid fa-code"></i> Embed
              </button>
              <button class="btn-card-action danger btn-delete-img" data-id="${img.id}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach Event Listeners to Dynamically Rendered Card Buttons
    attachCardEvents();
  }

  function attachCardEvents() {
    // 0. Image Thumbnail Click -> Full Size Lightbox View
    document.querySelectorAll('.card-img-wrapper').forEach(wrapper => {
      wrapper.addEventListener('click', function () {
        const parentCard = this.closest('.image-card');
        const id = parentCard ? parentCard.getAttribute('data-id') : null;
        const targetImg = allImagesList.find(img => img.id === id);
        if (targetImg) {
          openLightboxModal(targetImg);
        }
      });
    });

    // 1. Copy Link Event
    document.querySelectorAll('.btn-copy-url').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const url = this.getAttribute('data-url');
        copyToClipboard(url, 'Direct Image Shareable Link copied!');
      });
    });

    // 2. Open Embed Modal Event
    document.querySelectorAll('.btn-open-embed').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = this.getAttribute('data-id');
        const targetImg = allImagesList.find(img => img.id === id);
        if (targetImg) {
          openEmbedModal(targetImg);
        }
      });
    });

    // 3. Delete Image Event
    document.querySelectorAll('.btn-delete-img').forEach(btn => {
      btn.addEventListener('click', async function (e) {
        e.stopPropagation();
        const id = this.getAttribute('data-id');
        if (confirm('Kya aap sach mein is image ko permanent delete karna chahte hain?')) {
          await deleteImage(id);
        }
      });
    });
  }

  // ------------------------------------------
  // BULK SELECTION & JSZIP DOWNLOAD HANDLERS
  // ------------------------------------------
  const checkSelectAll = document.getElementById('checkSelectAll');
  const btnDownloadZipSelected = document.getElementById('btnDownloadZipSelected');
  let selectedImageIdsForBulk = new Set();

  if (checkSelectAll) {
    checkSelectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const cardCheckboxes = document.querySelectorAll('.card-checkbox');
      selectedImageIdsForBulk.clear();

      cardCheckboxes.forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) {
          selectedImageIdsForBulk.add(cb.getAttribute('data-id'));
        }
      });

      updateBulkActionBar();
    });
  }

  function updateBulkActionBar() {
    if (selectedImageIdsForBulk.size > 0) {
      btnDownloadZipSelected.classList.remove('hidden');
      btnDownloadZipSelected.innerHTML = `<i class="fa-solid fa-file-zipper"></i> Download Selected (${selectedImageIdsForBulk.size} .ZIP)`;
    } else {
      btnDownloadZipSelected.classList.add('hidden');
    }
  }

  if (btnDownloadZipSelected) {
    btnDownloadZipSelected.addEventListener('click', async () => {
      if (selectedImageIdsForBulk.size === 0) return;

      try {
        showToast('Preparing ZIP archive...', 'info');
        const zip = new JSZip();
        const selectedImages = allImagesList.filter(img => selectedImageIdsForBulk.has(img.id));

        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          const publicUrl = img.cloudUrl || img.localPath || `/uploads/${img.fileName}`;
          
          // Fetch blob for image
          const response = await fetch(publicUrl);
          const blob = await response.blob();
          zip.file(img.originalName, blob);
        }

        const zipContent = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipContent);
        a.download = `PixelVault_Export_${Date.now()}.zip`;
        a.click();

        showToast(`${selectedImages.length} images ZIP download start ho gaya!`, 'success');
      } catch (err) {
        console.error('ZIP Error:', err);
        showToast('ZIP archive create karne mein issue aaya.', 'error');
      }
    });
  }

  // ==========================================
  // 5. DELETE & STATS API HANDLERS
  // ==========================================
  async function deleteImage(id) {
    try {
      const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Image successfully delete kar di gayi!', 'info');
        fetchImagesList();
        fetchStorageStats();
      } else {
        showToast(`Delete failed: ${data.message}`, 'error');
      }
    } catch (err) {
      showToast('Delete karne mein issue aaya.', 'error');
    }
  }

  async function fetchStorageStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        const mbUsed = (data.totalBytes / (1024 * 1024)).toFixed(2);
        textTotalUsage.textContent = `${mbUsed} MB / 1 GB`;
        
        // Progress fill percent (1GB max demo)
        const percent = Math.min((data.totalBytes / (1024 * 1024 * 1024)) * 100, 100);
        barUsageFill.style.width = `${Math.max(percent, 2)}%`;

        badgeDbStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${data.dbStatus}`;
        badgeDbStatus.style.color = 'var(--color-emerald)';
      }
    } catch (err) {
      console.error('Stats Fetch Error:', err);
    }
  }

  // ==========================================
  // 6. EMBED MODAL & QR CODE GENERATOR
  // ==========================================
  let qrInstance = null;

  function openEmbedModal(img) {
    const publicUrl = img.cloudUrl || img.localPath || `/uploads/${img.fileName}`;
    const fullUrl = publicUrl.startsWith('http') ? publicUrl : `${window.location.origin}${publicUrl}`;

    modalPreviewImg.src = fullUrl;
    inputDirectUrl.value = fullUrl;
    inputHtmlEmbed.value = `<img src="${fullUrl}" alt="${img.originalName}" />`;
    inputMarkdownEmbed.value = `![${img.originalName}](${fullUrl})`;

    // Generate Live Scan-able QR Code using QRious
    const qrCanvas = document.getElementById('qrCodeCanvas');
    if (qrCanvas && window.QRious) {
      qrInstance = new QRious({
        element: qrCanvas,
        value: fullUrl,
        size: 140,
        level: 'H'
      });
    }

    embedModal.classList.remove('hidden');
  }

  const btnDownloadQr = document.getElementById('btnDownloadQr');
  if (btnDownloadQr) {
    btnDownloadQr.addEventListener('click', () => {
      const qrCanvas = document.getElementById('qrCodeCanvas');
      if (qrCanvas) {
        const a = document.createElement('a');
        a.href = qrCanvas.toDataURL('image/png');
        a.download = `QRCode_${Date.now()}.png`;
        a.click();
        showToast('QR Code Image downloaded!', 'success');
      }
    });
  }

  // ------------------------------------------
  // LIGHTBOX MODAL (FULL RESOLUTION VIEWER & VIEW COUNTER)
  // ------------------------------------------
  const lightboxModal = document.getElementById('lightboxModal');
  const btnCloseLightbox = document.getElementById('btnCloseLightbox');
  const lightboxFullImg = document.getElementById('lightboxFullImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxMetaInfo = document.getElementById('lightboxMetaInfo');
  const btnLightboxDownload = document.getElementById('btnLightboxDownload');

  async function openLightboxModal(img) {
    // Check password protection if set
    if (img.password) {
      promptPasswordProtection(img, () => showFullLightboxView(img));
      return;
    }
    showFullLightboxView(img);
  }

  async function showFullLightboxView(img) {
    const publicUrl = img.cloudUrl || img.localPath || `/uploads/${img.fileName}`;
    const fullUrl = publicUrl.startsWith('http') ? publicUrl : `${window.location.origin}${publicUrl}`;
    const formattedSize = formatBytes(img.fileSize);
    const dimensions = (img.dimensions && img.dimensions.width) ? `${img.dimensions.width}x${img.dimensions.height}px` : 'Full View';

    lightboxFullImg.src = fullUrl;
    lightboxTitle.innerHTML = `<i class="fa-regular fa-image icon-neon"></i> ${img.originalName}`;
    lightboxMetaInfo.textContent = `${dimensions} | ${formattedSize} | Views: ${(img.viewsCount || 0) + 1}`;
    
    btnLightboxDownload.onclick = async () => {
      fetch(`/api/images/${img.id}/download`, { method: 'POST' }).catch(() => {});
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = img.originalName;
      a.click();
      showToast('Download started!', 'success');
    };

    // Increment View Counter API
    fetch(`/api/images/${img.id}/view`, { method: 'POST' }).catch(() => {});

    lightboxModal.classList.remove('hidden');
  }

  // ------------------------------------------
  // PASSWORD VERIFICATION MODAL
  // ------------------------------------------
  const passwordModal = document.getElementById('passwordModal');
  const btnClosePasswordModal = document.getElementById('btnClosePasswordModal');
  const inputVerifyPassword = document.getElementById('inputVerifyPassword');
  const btnVerifySubmitPassword = document.getElementById('btnVerifySubmitPassword');
  let currentTargetProtectedImg = null;
  let currentPasswordSuccessCallback = null;

  function promptPasswordProtection(img, callback) {
    currentTargetProtectedImg = img;
    currentPasswordSuccessCallback = callback;
    inputVerifyPassword.value = '';
    passwordModal.classList.remove('hidden');
  }

  if (btnClosePasswordModal) {
    btnClosePasswordModal.addEventListener('click', () => {
      passwordModal.classList.add('hidden');
    });
  }

  if (btnVerifySubmitPassword) {
    btnVerifySubmitPassword.addEventListener('click', async () => {
      if (!currentTargetProtectedImg) return;
      const pwdVal = inputVerifyPassword.value.trim();

      try {
        const res = await fetch(`/api/images/${currentTargetProtectedImg.id}/verify-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwdVal })
        });

        const data = await res.json();
        if (data.success) {
          passwordModal.classList.add('hidden');
          showToast('Image Unlocked Successfully!', 'success');
          if (currentPasswordSuccessCallback) currentPasswordSuccessCallback();
        } else {
          showToast(data.message || 'Incorrect Password!', 'error');
        }
      } catch (err) {
        showToast('Password verification error.', 'error');
      }
    });
  }

  btnCloseLightbox.addEventListener('click', () => {
    lightboxModal.classList.add('hidden');
  });

  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) lightboxModal.classList.add('hidden');
  });

  btnCloseModal.addEventListener('click', () => {
    embedModal.classList.add('hidden');
  });

  embedModal.addEventListener('click', (e) => {
    if (e.target === embedModal) embedModal.classList.add('hidden');
  });

  // Modal Copy Buttons Event
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', function () {
      const targetInputId = this.getAttribute('data-target');
      const inputElem = document.getElementById(targetInputId);
      if (inputElem) {
        copyToClipboard(inputElem.value, 'Code successfully copy ho gaya!');
      }
    });
  });

  function copyToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(message, 'success');
    }).catch(() => {
      showToast('Clipboard access denied.', 'error');
    });
  }

  // Toast Notification System
  function showToast(msg, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // Search & Filter Listeners
  inputSearch.addEventListener('input', renderGallery);
  selectSort.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderGallery();
  });

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      renderGallery();
    });
  });

  // Helper function to format Bytes to KB / MB
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // INITIAL LAUNCH FETCH
  fetchImagesList();
  fetchStorageStats();
});
