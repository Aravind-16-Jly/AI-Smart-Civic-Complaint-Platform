import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  MapPinned,
  Mic,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { getComplaints, submitComplaint, supportComplaint, uploadImage } from '../services/api';

const defaultForm = {
  title: '',
  description: '',
  location: '',
  category: 'Road Damage',
  severity: 'Medium',
  lat: '12.9716',
  lng: '77.5946',
  imageUrl: '',
};

const onboardingSteps = ['Upload Image', 'AI Analysis', 'Track Complaint'];
const categoryOptions = ['Road Damage', 'Water Leakage', 'Garbage', 'Electricity', 'Streetlight', 'Traffic', 'General'];
const priorityOptions = ['Low', 'Medium', 'High', 'Emergency'];
const acceptedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const maxFileSizeBytes = 10 * 1024 * 1024;

function createComplaintId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CMP-${stamp}-${suffix}`;
}

function compressImageDataUrl(dataUrl, quality = 0.74) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image compression failed.'));
    img.src = dataUrl;
  });
}

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiScore, setAiScore] = useState(null);
  const [impactFactors, setImpactFactors] = useState({});
  const [impactExplanation, setImpactExplanation] = useState('');
  const [analysisState, setAnalysisState] = useState('idle');
  const [complaintId, setComplaintId] = useState('');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const loadComplaints = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await getComplaints();
      setComplaints(data || []);
      setErrorText('');
    } catch (error) {
      setErrorText(error.message || 'Unable to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const alreadySeen = localStorage.getItem('civic_onboarding_seen');
    setShowOnboarding(!alreadySeen);
    void loadComplaints();
    const timer = window.setInterval(() => {
      void loadComplaints({ silent: true });
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceAvailable(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm((current) => ({ ...current, description: `${current.description} ${transcript}`.trim() }));
    };
    recognitionRef.current = recognition;
    setVoiceAvailable(true);
  }, []);

  const descriptionLength = useMemo(() => form.description.length, [form.description]);

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: '' }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Complaint title is required.';
    }

    if (!form.description.trim()) {
      nextErrors.description = 'Description is required.';
    }

    if (!form.location.trim()) {
      nextErrors.location = 'Location is required.';
    }

    if (!Number.isFinite(Number(form.lat)) || !Number.isFinite(Number(form.lng))) {
      nextErrors.coordinates = 'Latitude and longitude must be valid numbers.';
    }

    setFormErrors(nextErrors);
    return nextErrors;
  };

  const handleImageSelection = async (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const invalidFiles = selectedFiles.filter((file) => !acceptedImageTypes.includes(file.type) || file.size > maxFileSizeBytes);
    if (invalidFiles.length) {
      const reasons = invalidFiles.map((file) => {
        if (!acceptedImageTypes.includes(file.type)) {
          return `${file.name} must be JPG, PNG, or WebP.`;
        }
        return `${file.name} exceeds the 10 MB limit.`;
      });
      setErrorText(reasons.join(' '));
      return;
    }

    const validFiles = selectedFiles.filter((file) => acceptedImageTypes.includes(file.type) && file.size <= maxFileSizeBytes);
    if (!validFiles.length) return;

    setUploading(true);
    setUploadProgress(0);
    setErrorText('');

    const uploadedItems = [];

    try {
      for (const [index, file] of validFiles.entries()) {
        const reader = new FileReader();
        const previewDataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Unable to read image file.'));
          reader.readAsDataURL(file);
        });

        const compressedUrl = await compressImageDataUrl(previewDataUrl, 0.74);
        const result = await uploadImage(compressedUrl, file.name, (percent) => {
          const overallPercent = Math.round(((index + 1) / validFiles.length) * 100 - ((100 / validFiles.length) * (1 - percent / 100)));
          setUploadProgress(overallPercent);
        });

        uploadedItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          fileName: file.name,
          previewUrl: compressedUrl,
          uploadUrl: result.imageUrl,
        });
      }

      const updatedImages = [...imagePreviews, ...uploadedItems];
      setImagePreviews(updatedImages);
      setForm((current) => ({
        ...current,
        imageUrl: updatedImages.map((item) => item.uploadUrl).join(','),
      }));
      setStatusText(validFiles.length > 1 ? `${validFiles.length} images uploaded successfully.` : 'Image uploaded successfully.');
    } catch (error) {
      setErrorText(error.message || 'Image upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImageChange = async (event) => {
    await handleImageSelection(event.target.files);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    await handleImageSelection(event.dataTransfer?.files);
  };

  const handleRemoveImage = (imageId) => {
    const nextImages = imagePreviews.filter((image) => image.id !== imageId);
    setImagePreviews(nextImages);
    setForm((current) => ({
      ...current,
      imageUrl: nextImages.map((image) => image.uploadUrl).join(','),
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorText('Geolocation is unavailable in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        setForm((current) => ({
          ...current,
          location: `${latitude}, ${longitude}`,
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
        }));
        setFormErrors((current) => ({ ...current, location: '' }));
        setStatusText('Current location loaded successfully.');
      },
      () => {
        setErrorText('Unable to access your current location.');
      },
    );
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setErrorText('Voice input is not supported in this browser.');
      return;
    }
    recognitionRef.current.start();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusText('');
    setErrorText('');

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      setErrorText('Please fill in the required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    setAnalysisState('processing');
    const nextComplaintId = createComplaintId();
    setComplaintId(nextComplaintId);

    try {
      const payload = {
        ...form,
        complaintId: nextComplaintId,
        priority: form.severity,
        lat: Number(form.lat),
        lng: Number(form.lng),
      };

      const response = await submitComplaint(payload);
      const complaint = response?.data;

      if (response?.duplicate) {
        setStatusText(response.duplicateMessage || 'This issue has already been reported.');
        setErrorText('');
      } else {
        setStatusText(response.message || 'Complaint submitted successfully.');
      }

      setAnalysisState('ready');
      setAiScore(complaint?.ai?.confidence || 93);
      setImpactFactors(complaint?.ai?.impactFactors || {});
      setImpactExplanation(complaint?.ai?.explanation || 'Why AI made this decision: complaint severity, location context, and an urban risk model were combined to evaluate urgency.');
      setForm({ ...defaultForm, id: nextComplaintId });
      setImagePreviews([]);
      setComplaintId(complaint?.id || nextComplaintId);
      await loadComplaints({ silent: true });
    } catch (error) {
      setErrorText(error.message || 'Complaint submission failed.');
      setAnalysisState('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupportComplaint = async (id) => {
    try {
      const response = await supportComplaint(id);
      const updatedComplaint = response?.data;
      setComplaints((current) => current.map((item) => (item.id === id ? updatedComplaint : item)));
      setStatusText(response.message || 'Support added to complaint.');
    } catch (error) {
      setErrorText(error.message || 'Unable to add support.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('civic_token');
    localStorage.removeItem('civic_user');
    navigate('/auth');
  };

  const dismissOnboarding = () => {
    localStorage.setItem('civic_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="glass rounded-[28px] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-brand-200">Citizen dashboard</div>
              <h1 className="mt-2 text-3xl font-semibold">Your civic reporting center</h1>
            </div>
            <div className="flex items-center gap-3">
              <a href="#complaint-form" className="button-primary ripple rounded-full px-4 py-2 text-sm font-semibold text-white">Upload complaint</a>
              <button type="button" onClick={handleLogout} className="button-secondary ripple rounded-full px-4 py-2 text-sm text-white">Logout</button>
            </div>
          </div>
        </div>

        {showOnboarding ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[28px] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-brand-200"><Sparkles size={14} /> 3-step onboarding</div>
                <div className="flex flex-wrap items-center gap-3">
                  {onboardingSteps.map((step, index) => (
                    <div key={step} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      {index + 1}. {step}
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={dismissOnboarding} className="button-ghost ripple rounded-full px-4 py-2 text-sm text-slate-100">Start reporting</button>
            </div>
          </motion.div>
        ) : null}

        <div id="complaint-form" className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <form className="premium-card glass rounded-3xl p-5 space-y-4" onSubmit={handleSubmit}>
            <div className="text-lg font-semibold">Submit new complaint</div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="relative">
                  <label className="pointer-events-none absolute left-4 top-2 text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Complaint Title</label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 pb-3 pt-7 text-sm text-white outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_24px_rgba(59,130,246,0.14)]"
                    placeholder="Complaint title"
                    value={form.title}
                    onChange={(event) => updateFormField('title', event.target.value)}
                    required
                  />
                </div>
                {formErrors.title ? <p className="mt-2 text-xs text-rose-300">{formErrors.title}</p> : null}
              </div>
              <div>
                <div className="relative">
                  <label className="pointer-events-none absolute left-4 top-2 text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Category</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 pb-3 pt-7 text-sm text-white outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_24px_rgba(59,130,246,0.14)]"
                    value={form.category}
                    onChange={(event) => updateFormField('category', event.target.value)}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative">
                <label className="pointer-events-none absolute left-4 top-2 text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Description</label>
                <textarea
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 pb-3 pt-8 text-sm text-white outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_24px_rgba(59,130,246,0.14)]"
                  placeholder="Provide a description"
                  value={form.description}
                  onChange={(event) => updateFormField('description', event.target.value)}
                  rows="4"
                  required
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{descriptionLength}/320 characters</span>
                <button type="button" onClick={startListening} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
                  <Mic size={14} /> {voiceAvailable ? 'Voice Input' : 'Voice Unavailable'}
                </button>
              </div>
              {formErrors.description ? <p className="mt-2 text-xs text-rose-300">{formErrors.description}</p> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="relative">
                  <label className="pointer-events-none absolute left-4 top-2 text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Location</label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 pb-3 pt-7 text-sm text-white outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_24px_rgba(59,130,246,0.14)]"
                    placeholder="Location"
                    value={form.location}
                    onChange={(event) => updateFormField('location', event.target.value)}
                    required
                  />
                </div>
                {formErrors.location ? <p className="mt-2 text-xs text-rose-300">{formErrors.location}</p> : null}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleUseCurrentLocation} className="button-secondary ripple flex-1 rounded-2xl px-3 py-3 text-sm text-white">
                  <span className="inline-flex items-center gap-2"><MapPinned size={14} /> Use current location</span>
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="relative">
                  <label className="pointer-events-none absolute left-4 top-2 text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Priority</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 pb-3 pt-7 text-sm text-white outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_24px_rgba(59,130,246,0.14)]"
                    value={form.severity}
                    onChange={(event) => updateFormField('severity', event.target.value)}
                  >
                    {priorityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="relative">
                <label className="pointer-events-none absolute left-4 top-2 text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Latitude</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 pb-3 pt-7 text-sm text-white outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_24px_rgba(59,130,246,0.14)]"
                  placeholder="Latitude"
                  value={form.lat}
                  onChange={(event) => updateFormField('lat', event.target.value)}
                />
              </div>
              <div className="relative">
                <label className="pointer-events-none absolute left-4 top-2 text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Longitude</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 pb-3 pt-7 text-sm text-white outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_24px_rgba(59,130,246,0.14)]"
                  placeholder="Longitude"
                  value={form.lng}
                  onChange={(event) => updateFormField('lng', event.target.value)}
                />
              </div>
            </div>
            {formErrors.coordinates ? <p className="text-xs text-rose-300">{formErrors.coordinates}</p> : null}

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
              className={`rounded-2xl border border-dashed p-4 transition-all duration-300 ${dragActive ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.28)]' : 'border-white/10 bg-slate-900/60'}`}
            >
              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 text-sm text-slate-300 transition-all duration-200 hover:text-white">
                <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-200 shadow-[0_0_18px_rgba(59,130,246,0.24)]">
                  <UploadCloud size={24} className="animate-pulse" />
                </div>
                <span className="text-center text-base font-medium">Upload Image</span>
                <span className="text-center text-xs text-slate-400">Drag & drop an image, or click to browse JPG, JPEG, PNG, or WebP files up to 10 MB</span>
                <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple capture="environment" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            {uploading ? (
              <div className="rounded-2xl bg-white/5 p-3 text-sm">Uploading image... {uploadProgress}%</div>
            ) : null}

            {imagePreviews.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {imagePreviews.map((image) => (
                  <div key={image.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                    <img src={image.previewUrl} alt={image.fileName} className="h-40 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-3 py-2 text-xs text-slate-200">
                      {image.fileName}
                    </div>
                    <button type="button" onClick={() => handleRemoveImage(image.id)} className="absolute right-2 top-2 rounded-full bg-slate-900/85 p-2 text-white">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {statusText ? (
              <div className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 inline-flex items-center gap-2">
                <CheckCircle2 size={16} /> {statusText}
              </div>
            ) : null}
            {errorText ? <div className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{errorText}</div> : null}

            <button type="submit" disabled={isSubmitting} className="button-primary ripple w-full rounded-2xl px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-80">
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="animate-spin" size={16} />
                  Submitting complaint...
                </span>
              ) : (
                'Submit complaint'
              )}
            </button>
          </form>

          <div className="space-y-4">
            <div className="premium-card glass rounded-3xl p-5">
              <div className="text-lg font-semibold">AI impact score</div>
              <AnimatePresence mode="wait">
                {analysisState === 'processing' ? (
                  <motion.div key="processing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-4 text-sm text-brand-100">
                    <div className="flex items-center gap-2 text-base font-semibold"><Sparkles size={16} /> Analyzing complaint...</div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-300" initial={{ width: '12%' }} animate={{ width: ['12%', '46%', '80%', '100%'] }} transition={{ duration: 1.8, repeat: Infinity }} />
                    </div>
                  </motion.div>
                ) : analysisState === 'ready' ? (
                  <motion.div key="ready" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-white">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Complaint {complaintId || 'CMP-READY'}</span>
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-100">Confidence {aiScore ?? 93}%</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-900/50 p-3">Category: {form.category}</div>
                      <div className="rounded-xl bg-slate-900/50 p-3">Priority: {form.severity}</div>
                      <div className="rounded-xl bg-slate-900/50 p-3">Department: Public Works</div>
                      <div className="rounded-xl bg-slate-900/50 p-3">Impact Score: {aiScore ?? 93}/100</div>
                    </div>
                    <div className="rounded-xl bg-slate-900/50 p-3">Suggested action: Dispatch inspection and update citizen within 2 hours.</div>
                    <div className="rounded-xl bg-slate-900/50 p-3">Why AI made this decision: {impactExplanation}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(impactFactors).map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-slate-200">
                          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">{label}</div>
                          <div className="font-semibold text-white">{Math.round(value)}%</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Submit a complaint to trigger the AI analysis and recommended response flow.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="premium-card glass rounded-3xl p-5">
              <div className="text-lg font-semibold">Recent complaints</div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="skeleton-bar h-3 w-24 rounded-full" />
                        <div className="mt-3 skeleton-bar h-4 w-40 rounded-full" />
                        <div className="mt-3 skeleton-bar h-3 w-28 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  complaints.slice(0, 5).map((item) => (
                    <div key={item.id} className="premium-card rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-slate-400">{item.id}</div>
                      <div className="mt-2 text-lg font-semibold">{item.title}</div>
                      <div className="mt-2 text-sm text-slate-300">{item.location}</div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="rounded-full bg-white/5 px-3 py-1">{item.status}</span>
                        <span className="text-brand-200">{item.severity}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{item.communitySupport || `${item.supportCount || 0} citizens supporting`}</span>
                        <button type="button" onClick={() => void handleSupportComplaint(item.id)} className="button-secondary ripple rounded-full px-3 py-1 text-xs text-white">Support complaint</button>
                      </div>
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="mt-3 h-32 w-full rounded-xl object-cover" /> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
