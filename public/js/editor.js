// =========================================================================
// PUBLIC/JS/EDITOR.JS - Image Canvas Cropper & Transform Controller
// =========================================================================
// Yeh JavaScript module image cropping, rotation, aspect ratio, aur canvas blob
// generation handle karta hai. Iss mein har step beginner-friendly Hindi mein comment hai.

let cropperInstance = null; // Global variable Cropper instance hold karne ke liye
let currentSelectedFile = null; // Original File reference

// Cropper Initialize karne ka function
function initImageEditor(file) {
  currentSelectedFile = file;
  
  const canvasPlaceholder = document.getElementById('canvasPlaceholder');
  const imageToCrop = document.getElementById('imageToCrop');
  const editorControlsPanel = document.getElementById('editorControlsPanel');

  // File ko Data URL mein read karke image preview element mein load karte hain
  const reader = new FileReader();
  reader.onload = function (e) {
    // Hidden controls panel ko enable aur show karo
    canvasPlaceholder.classList.add('hidden');
    imageToCrop.classList.remove('hidden');
    editorControlsPanel.classList.remove('disabled-overlay');

    imageToCrop.src = e.target.result;

    // Purana Cropper instance destroy karo agar koi pehle se active tha
    if (cropperInstance) {
      cropperInstance.destroy();
    }

    // Naya Cropper.js instance initialize kar rahe hain
    cropperInstance = new Cropper(imageToCrop, {
      aspectRatio: NaN, // Free aspect ratio by default (Original Image bounds)
      viewMode: 1,      // Crop box image bounds ke andar rahega
      autoCropArea: 1,  // 100% full image length coverage by default!
      responsive: true,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false
    });
  };

  reader.readAsDataURL(file);
}

// ------------------------------------------
// EVENT LISTENERS: ASPECT RATIO BUTTONS
// ------------------------------------------
document.querySelectorAll('.btn-ratio').forEach(btn => {
  btn.addEventListener('click', function () {
    // Sabhi buttons se active class remove karke clicked button par lagao
    document.querySelectorAll('.btn-ratio').forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    const ratio = parseFloat(this.getAttribute('data-ratio'));
    if (cropperInstance) {
      cropperInstance.setAspectRatio(isNaN(ratio) ? NaN : ratio);
    }
  });
});

// ------------------------------------------
// EVENT LISTENERS: ROTATION & FLIP
// ------------------------------------------
document.getElementById('btnRotateLeft').addEventListener('click', () => {
  if (cropperInstance) cropperInstance.rotate(-90);
});

document.getElementById('btnRotateRight').addEventListener('click', () => {
  if (cropperInstance) cropperInstance.rotate(90);
});

let isFlippedH = false;
document.getElementById('btnFlipH').addEventListener('click', () => {
  if (cropperInstance) {
    isFlippedH = !isFlippedH;
    cropperInstance.scaleX(isFlippedH ? -1 : 1);
  }
});

rangeQuality.addEventListener('input', function () {
  valQualityText.textContent = `${this.value}%`;
});

// ------------------------------------------
// EVENT LISTENER: LIVE AI FILTER PREVIEW
// ------------------------------------------
const selectFilterPreset = document.getElementById('selectFilterPreset');
if (selectFilterPreset) {
  selectFilterPreset.addEventListener('change', function () {
    const val = this.value;
    let filterString = 'none';
    if (val === 'cinematic') filterString = 'contrast(1.25) saturate(1.35) hue-rotate(-10deg)';
    if (val === 'vintage') filterString = 'sepia(0.45) contrast(1.15) brightness(0.92)';
    if (val === 'cyberpunk') filterString = 'contrast(1.4) saturate(1.8) hue-rotate(180deg)';
    if (val === 'grayscale') filterString = 'grayscale(100%)';
    if (val === 'sepia') filterString = 'sepia(100%)';
    if (val === 'hdr') filterString = 'saturate(1.65) contrast(1.35)';

    const cropBoxImgs = document.querySelectorAll('.cropper-container img, #imageToCrop');
    cropBoxImgs.forEach(img => {
      img.style.filter = filterString;
    });
  });
}

// ------------------------------------------
// HELPER: Cropped Image Canvas to Blob Converter
// ------------------------------------------
// ------------------------------------------
// HELPER: Cropped Image Canvas to Blob Converter (With AI Filters & Watermark)
// ------------------------------------------
function getCroppedCanvasBlob(format = 'image/webp', quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!cropperInstance) {
      return reject(new Error('Editor active nahi hai.'));
    }

    const initialCanvas = cropperInstance.getCroppedCanvas();
    if (!initialCanvas) {
      return reject(new Error('Canvas render nahi ho paya.'));
    }

    // Read AI Filter Preset & Watermark Text values
    const selectFilterPreset = document.getElementById('selectFilterPreset');
    const inputWatermarkText = document.getElementById('inputWatermarkText');

    const filterVal = selectFilterPreset ? selectFilterPreset.value : 'none';
    const watermarkVal = inputWatermarkText ? inputWatermarkText.value.trim() : '';

    // Create a secondary canvas for filter & watermark processing
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = initialCanvas.width;
    finalCanvas.height = initialCanvas.height;
    const ctx = finalCanvas.getContext('2d');

    // 1. Apply AI Filter CSS Filter string
    let filterString = 'none';
    if (filterVal === 'cinematic') filterString = 'contrast(1.25) saturate(1.35) hue-rotate(-10deg)';
    if (filterVal === 'vintage') filterString = 'sepia(0.45) contrast(1.15) brightness(0.92)';
    if (filterVal === 'cyberpunk') filterString = 'contrast(1.4) saturate(1.8) hue-rotate(180deg)';
    if (filterVal === 'grayscale') filterString = 'grayscale(100%)';
    if (filterVal === 'sepia') filterString = 'sepia(100%)';
    if (filterVal === 'hdr') filterString = 'saturate(1.65) contrast(1.35)';

    ctx.filter = filterString;
    ctx.drawImage(initialCanvas, 0, 0);

    // Reset filter for watermark overlay
    ctx.filter = 'none';

    // 2. Apply Watermark Overlay if provided
    if (watermarkVal) {
      const fontSize = Math.max(16, Math.floor(finalCanvas.width / 28));
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      const margin = fontSize;
      const textWidth = ctx.measureText(watermarkVal).width;
      
      // Semi-transparent dark pill behind watermark text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(
        finalCanvas.width - textWidth - margin * 1.5,
        finalCanvas.height - fontSize - margin * 1.2,
        textWidth + margin,
        fontSize * 1.4
      );

      // Watermark Text with neon cyan shadow
      ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(watermarkVal, finalCanvas.width - margin, finalCanvas.height - margin * 0.5);
    }

    // Canvas to Blob Conversion
    finalCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Blob conversion fail ho gaya.'));
        }
      },
      format,
      quality
    );
  });
}
