const API_URL = 'http://127.0.0.1:5000/analyze';
let currentFile = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const uploadInstructions = document.getElementById('uploadInstructions');
const previewContainer = document.getElementById('previewContainer');
const previewImg = document.getElementById('previewImg');
const cancelBtn = document.getElementById('cancelBtn');

// --- Event Listeners ---

// Click to upload (Only if no file is currently selected)
dropZone.addEventListener('click', () => {
    if (!currentFile) {
        fileInput.click();
    }
});

// Cancel Button Click
cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    resetUI();
});

// File input change
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Analyze button click
analyzeBtn.addEventListener('click', analyzeImage);

// Drag & Drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) { 
    e.preventDefault(); 
    e.stopPropagation(); 
}

['dragenter', 'dragover'].forEach(eventName => { 
    dropZone.addEventListener(eventName, highlight, false); 
});

['dragleave', 'drop'].forEach(eventName => { 
    dropZone.addEventListener(eventName, unhighlight, false); 
});

function highlight() { 
    if (!currentFile) {
        dropZone.style.borderColor = 'var(--primary)'; 
        dropZone.style.background = '#ecfdf5'; 
    }
}

function unhighlight() { 
    if (!currentFile) {
        dropZone.style.borderColor = '#cbd5e1'; 
        dropZone.style.background = '#f8fafc'; 
    }
}

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    handleFile(dt.files[0]);
});

// --- Core Functions ---

function handleFile(file) {
    if (file && file.type.startsWith('image/')) {
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            // Update Preview Image
            previewImg.src = e.target.result;
            
            // Toggle UI States
            uploadInstructions.style.display = 'none';
            previewContainer.style.display = 'block';
            
            // Add class for styling border and padding
            dropZone.classList.add('active-file');
            
            // Enable analyze button
            analyzeBtn.disabled = false;

            // Show Change Image Button
            cancelBtn.style.display = 'flex'; 
        };
        reader.readAsDataURL(file);
    } else {
        alert("Please upload a valid image file.");
    }
}

function resetUI() {
    currentFile = null;
    fileInput.value = ''; // Reset input so same file can be selected again
    
    // --- Left Side Reset ---
    previewImg.src = '';
    previewContainer.style.display = 'none';
    uploadInstructions.style.display = 'block';
    dropZone.classList.remove('active-file');
    
    dropZone.style.borderColor = '#cbd5e1'; 
    dropZone.style.background = '#f8fafc'; 
    
    analyzeBtn.disabled = true;
    cancelBtn.style.display = 'none';

    // --- Right Side Reset (Results) ---
    const content = document.getElementById('resultContent');
    const empty = document.getElementById('emptyState');
    const diseaseName = document.getElementById('diseaseName');
    const confBar = document.getElementById('confidenceBar');
    const confText = document.getElementById('confidenceText');
    const valText = document.getElementById('validationText');
    const indicator = document.getElementById('statusIndicator');

    // 1. Show Empty State / Blur Content
    empty.style.display = 'block'; // Bring back the microscope icon
    content.style.opacity = '0.5';
    content.style.filter = 'blur(2px)';

    // 2. Reset Status Badge
    indicator.className = 'status-badge';
    indicator.innerHTML = '<i class="fa-solid fa-circle-question"></i> Waiting for input...';

    // 3. Reset Text Values
    diseaseName.textContent = '--';
    diseaseName.style.color = 'var(--text-main)'; // Reset color from red/green
    
    // 4. Reset Bars
    confBar.style.width = '0%';
    confBar.style.backgroundColor = 'var(--primary)';
    confText.textContent = '0%';
    
    valText.textContent = 'Pending Validation...';
}

async function analyzeImage() {
    if (!currentFile) return;

    analyzeBtn.innerHTML = '<div class="spinner"></div> Processing...';
    analyzeBtn.disabled = true;
    cancelBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', currentFile);

    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        
        displayResults(data);

    } catch (error) {
        console.error(error);
        updateStatus('danger', 'Connection Error');
    } finally {
        analyzeBtn.innerHTML = '<span>Run Analysis</span>';
        analyzeBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}

function displayResults(data) {
    const content = document.getElementById('resultContent');
    const empty = document.getElementById('emptyState');
    const diseaseName = document.getElementById('diseaseName');
    const confBar = document.getElementById('confidenceBar');
    const confText = document.getElementById('confidenceText');
    const valText = document.getElementById('validationText');

    // Show results area
    empty.style.display = 'none';
    content.style.opacity = '1';
    content.style.filter = 'none';

    if (data.status === 'Success') {
        updateStatus('success', 'Analysis Complete');
        
        let diagnosis = "";
        let confidence = 0;
        let isHealthy = false;

        if (data.diagnosis === 'Healthy' || data.diagnosis === 'Unclear/Healthy') {
            diagnosis = "Healthy Leaf";
            confidence = 0.95; 
            isHealthy = true;
        } else if (Array.isArray(data.diagnosis)) {
            diagnosis = data.diagnosis[0].disease.replace(/_/g, " "); 
            confidence = data.diagnosis[0].confidence;
            isHealthy = (diagnosis.toLowerCase() === 'healthy');
        }

        if (isHealthy) {
            diseaseName.style.color = 'var(--success)';
            confBar.style.backgroundColor = 'var(--success)';
        } else {
            diseaseName.style.color = 'var(--danger)';
            confBar.style.backgroundColor = 'var(--danger)';
        }

        diseaseName.textContent = diagnosis;
        
        setTimeout(() => {
            confBar.style.width = (confidence * 100) + '%';
        }, 100);
        confText.textContent = (confidence * 100).toFixed(1) + '%';
        valText.textContent = `Validated as: ${data.validation}`;

    } else {
        updateStatus('danger', 'Rejected');
        diseaseName.textContent = "Invalid Image";
        diseaseName.style.color = 'var(--text-sub)';
        confBar.style.width = '0%';
        confText.textContent = '0%';
        valText.textContent = data.message || "Image validation failed.";
    }
}

function updateStatus(type, text) {
    const indicator = document.getElementById('statusIndicator');
    indicator.className = `status-badge ${type}`;
    indicator.innerHTML = `<i class="fa-solid fa-circle-${type === 'success' ? 'check' : 'xmark'}"></i> ${text}`;
}