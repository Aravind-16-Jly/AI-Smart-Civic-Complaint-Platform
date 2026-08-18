import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'civicmind-dev-secret';
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
  }
  return next(error);
});

const demoUsers = [
  {
    id: 'USR-1001',
    name: 'Asha Kumar',
    email: 'citizen@civicmind.ai',
    passwordHash: bcrypt.hashSync('Password123!', 10),
    role: 'citizen',
  },
  {
    id: 'USR-1002',
    name: 'Ravi Mehta',
    email: 'authority@civicmind.ai',
    passwordHash: bcrypt.hashSync('Password123!', 10),
    role: 'authority',
  },
];

const demoComplaints = [
  {
    id: 'CMP-1001',
    title: 'Pothole near main road',
    description: 'Severe pothole causing traffic disruption on the main corridor.',
    category: 'Road Damage',
    severity: 'High',
    status: 'Pending',
    location: 'Sector 12',
    department: 'Public Works',
    lat: 12.9716,
    lng: 77.5946,
    imageUrl: '',
    createdAt: new Date().toISOString(),
    ai: {
      summary: 'Road damage report with active traffic risk.',
      department: 'Public Works',
      severity: 'High',
      category: 'Road Damage',
    },
  },
  {
    id: 'CMP-1002',
    title: 'Garbage overflow in park',
    description: 'Garbage bins overflowing near the central park entry.',
    category: 'Waste Management',
    severity: 'Medium',
    status: 'In Review',
    location: 'Central Park',
    department: 'Sanitation',
    lat: 12.926,
    lng: 77.6753,
    imageUrl: '',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    ai: {
      summary: 'Accumulated solid waste observed in public area.',
      department: 'Sanitation',
      severity: 'Medium',
      category: 'Waste Management',
    },
  },
  {
    id: 'CMP-1003',
    title: 'Streetlight outage',
    description: 'Streetlight out near the market lane, creating safety concerns.',
    category: 'Streetlight',
    severity: 'Critical',
    status: 'Assigned',
    location: 'Market Lane',
    department: 'Electrical',
    lat: 12.9719,
    lng: 77.5713,
    imageUrl: '',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    ai: {
      summary: 'Public safety lighting outage reported in active market corridor.',
      department: 'Electrical',
      severity: 'Critical',
      category: 'Streetlight',
    },
  },
];

const demoNotifications = [
  {
    id: 'NT-1001',
    message: 'Complaint CMP-1001 has been moved to Public Works.',
    type: 'assignment',
    read: false,
    complaintId: 'CMP-1001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'NT-1002',
    message: 'Priority review requested for CMP-1003.',
    type: 'alert',
    read: false,
    complaintId: 'CMP-1003',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

const defaultStore = {
  users: demoUsers,
  complaints: demoComplaints,
  notifications: demoNotifications,
};

let store = structuredClone(defaultStore);

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    store = {
      users: Array.isArray(parsed.users) ? parsed.users : defaultStore.users,
      complaints: Array.isArray(parsed.complaints) ? parsed.complaints : defaultStore.complaints,
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : defaultStore.notifications,
    };
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(defaultStore, null, 2));
    store = structuredClone(defaultStore);
  }
}

async function persistStore() {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function getUserByEmail(email) {
  return store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function getUserById(id) {
  return store.users.find((user) => user.id === id);
}

function loadUserFromToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function createComplaintId() {
  return `CMP-${Date.now()}`;
}

function sanitizeName(name) {
  return String(name || '').replace(/[^a-zA-Z0-9-_ .]/g, '').trim();
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeSimilarity(a = '', b = '') {
  const left = new Set(normalizeText(a).split(' '));
  const right = new Set(normalizeText(b).split(' '));
  const intersection = [...left].filter((term) => right.has(term));
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  return intersection.length / union.size;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildImpactScore(title, description, location, severity) {
  const text = normalizeText(`${title} ${description} ${location}`);
  let score = 70;

  if (text.includes('road') || text.includes('pothole')) score += 8;
  if (text.includes('water') || text.includes('leak')) score += 10;
  if (text.includes('garbage') || text.includes('waste') || text.includes('trash')) score += 7;
  if (text.includes('light') || text.includes('streetlight')) score += 9;
  if (text.includes('traffic')) score += 6;
  if (text.includes('rain') || text.includes('storm')) score += 5;
  if (text.includes('school') || text.includes('hospital') || text.includes('bus')) score += 4;

  const severityBoost = {
    Low: 2,
    Medium: 5,
    High: 9,
    Emergency: 12,
    Critical: 14,
  };

  score += severityBoost[severity] || 5;
  score = clamp(score, 62, 98);

  return {
    score,
    factors: {
      roadSafetyRisk: clamp(score - 8, 55, 99),
      trafficDensity: clamp(score - 4, 50, 98),
      nearbySchools: clamp(score - 12, 48, 96),
      nearbyHospitals: clamp(score - 6, 52, 97),
      nearbyBusStops: clamp(score - 10, 50, 94),
      populationAffected: clamp(score - 1, 60, 99),
      weatherConditions: clamp(score - 7, 54, 95),
    },
  };
}

function buildRecommendation(category, severity, location) {
  const departmentMap = {
    'Waste Management': 'Sanitation',
    'Road Damage': 'Public Works',
    'Water Supply': 'Water Department',
    Streetlight: 'Electrical',
    General: 'Administration',
    Traffic: 'Traffic Police',
    Electricity: 'Electrical',
  };

  const workerMap = {
    'Waste Management': 3,
    'Road Damage': 5,
    'Water Supply': 4,
    Streetlight: 2,
    Traffic: 4,
    General: 2,
    Electricity: 3,
  };

  const timeMap = {
    Low: '1 day',
    Medium: '2 days',
    High: '4 days',
    Emergency: '6 hours',
    Critical: '2 hours',
  };

  const costMap = {
    'Waste Management': '₹18,000',
    'Road Damage': '₹42,000',
    'Water Supply': '₹35,000',
    Streetlight: '₹12,000',
    Traffic: '₹27,000',
    General: '₹10,000',
    Electricity: '₹16,000',
  };

  const materialMap = {
    'Waste Management': 'Bins, cleanup crew, sanitation units',
    'Road Damage': 'Bitumen, compactors, safety barriers',
    'Water Supply': 'Pipeline kits, pressure tools, repair clamps',
    Streetlight: 'LED lamps, wiring kits, poles',
    Traffic: 'Signal modules, reflective signage, barricades',
    General: 'Dispatch kits, field assessment unit',
    Electricity: 'Cable spools, breakers, fuse units',
  };

  return {
    responsibleDepartment: departmentMap[category] || 'Administration',
    workersRequired: workerMap[category] || 2,
    estimatedCost: costMap[category] || '₹12,000',
    estimatedRepairTime: timeMap[severity] || '2 days',
    priority: severity || 'Medium',
    materialsNeeded: materialMap[category] || 'Field repair kit',
    explanation: `${category} near ${location || 'reported location'} requires coordinated ${departmentMap[category] || 'administrative'} intervention for rapid resolution.`,
  };
}

function buildPredictionHistorySnapshot() {
  const history = store.complaints.map((item) => ({
    category: item.category,
    severity: item.severity,
    status: item.status,
    createdAt: item.createdAt,
  }));

  const categoryRisk = {};
  for (const item of history) {
    categoryRisk[item.category] = (categoryRisk[item.category] || 0) + (item.severity === 'Critical' ? 3 : item.severity === 'High' ? 2 : 1);
  }

  return [
    { label: 'Flood Risk', percentage: clamp(18 + (categoryRisk['Water Supply'] || 0) * 10, 18, 92), confidence: 77, explanation: 'Water-related interruptions in the monitored region indicate a growing drainage risk pattern.', recommendedAction: 'Inspect drainage lines and deploy flood response team.' },
    { label: 'Garbage Overflow Risk', percentage: clamp(14 + (categoryRisk['Waste Management'] || 0) * 12, 14, 90), confidence: 81, explanation: 'Density of sanitation incidents suggests a rising overflow pattern near high-traffic zones.', recommendedAction: 'Increase collection sweep frequency at hotspots.' },
    { label: 'Road Damage Expansion', percentage: clamp(20 + (categoryRisk['Road Damage'] || 0) * 11, 20, 96), confidence: 84, explanation: 'Recurring transport incidents point to worsening pavement degradation trends.', recommendedAction: 'Prioritize lane repair and traffic block mitigation.' },
    { label: 'Streetlight Failure Zone', percentage: clamp(12 + (categoryRisk['Streetlight'] || 0) * 10, 12, 89), confidence: 74, explanation: 'Lighting outage clusters are emerging in under-served corridors.', recommendedAction: 'Dispatch maintenance to the top 3 safety hotspots.' },
  ];
}

function buildHealthScore() {
  const complaintCount = store.complaints.length;
  const road = clamp(92 - complaintCount * 1.4, 55, 97);
  const drainage = clamp(89 - (store.complaints.filter((item) => item.category === 'Water Supply').length * 2.6), 52, 95);
  const lighting = clamp(91 - (store.complaints.filter((item) => item.category === 'Streetlight').length * 2.8), 51, 96);
  const garbage = clamp(88 - (store.complaints.filter((item) => item.category === 'Waste Management').length * 2.1), 54, 94);
  const water = clamp(90 - (store.complaints.filter((item) => item.category === 'Water Supply').length * 2.4), 53, 94);
  const overall = Math.round((road + drainage + lighting + garbage + water) / 5);

  return {
    roadHealth: Math.round(road),
    drainage: Math.round(drainage),
    lighting: Math.round(lighting),
    garbageManagement: Math.round(garbage),
    waterSupply: Math.round(water),
    overallHealthScore: overall,
    areaRanking: `Rank ${Math.max(1, Math.round(12 - overall / 8))} in the city network`,
    trend: overall >= 85 ? 'Improving' : 'Watchlist',
    recommendations: [
      'Increase preventive inspections for high-risk corridors.',
      'Boost public sanitation scheduling during peak demand windows.',
      'Escalate utility maintenance for recurring outage hotspots.',
    ],
  };
}

function detectDuplicateComplaint({ title = '', description = '', location = '', imageUrl = '' }) {
  const trimmedTitle = normalizeText(title);
  const trimmedDescription = normalizeText(description);
  const trimmedLocation = normalizeText(location);

  return store.complaints.find((complaint) => {
    const locationMatch = normalizeText(complaint.location) === trimmedLocation && trimmedLocation.length > 1;
    const descriptionMatch = computeSimilarity(complaint.description, description) > 0.48;
    const titleMatch = computeSimilarity(complaint.title, title) > 0.42;
    const imageMatch = Boolean(imageUrl) && Boolean(complaint.imageUrl) && complaint.imageUrl === imageUrl;

    return (locationMatch && (descriptionMatch || titleMatch)) || imageMatch;
  });
}

function enrichComplaint(complaint) {
  const impactData = buildImpactScore(complaint.title, complaint.description, complaint.location, complaint.severity);
  const recommendation = buildRecommendation(complaint.category, complaint.severity, complaint.location);
  const supportCount = complaint.supportCount || 0;
  const escalationAge = Math.max(0, Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60);
  const escalation = complaint.status === 'Resolved' ? false : escalationAge > 24;

  return {
    ...complaint,
    supportCount,
    supportLabel: supportCount > 0 ? `${supportCount} citizens supporting` : 'Community support pending',
    impactScore: impactData.score,
    impactFactors: impactData.factors,
    recommendation,
    ai: {
      ...complaint.ai,
      confidence: complaint.ai?.confidence || 93,
      explainability: complaint.ai?.explainability || `${complaint.severity || 'Medium'} priority was inferred from the complaint urgency, local activity pattern, and historical incident density in ${complaint.location || 'this area'}.`,
      explanation: complaint.ai?.explanation || `Why AI made this decision: the complaint text, field severity, and historical city risk pattern were combined to prioritize ${complaint.department || 'the relevant department'} for a rapid triage cycle.`,
      impactScore: impactData.score,
      impactFactors: impactData.factors,
      recommendation,
    },
    escalation,
  };
}

async function inferAI(title, description, location, severity) {
  const text = `${title} ${description} ${location}`.toLowerCase();

  let category = 'General';
  if (text.includes('garbage') || text.includes('waste') || text.includes('trash')) category = 'Waste Management';
  if (text.includes('road') || text.includes('pothole') || text.includes('street')) category = 'Road Damage';
  if (text.includes('water') || text.includes('leak')) category = 'Water Supply';
  if (text.includes('light') || text.includes('streetlight')) category = 'Streetlight';

  const severityMap = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  const chosenSeverity = severityMap[severity?.toLowerCase()] || 'Medium';
  const departmentMap = {
    'Waste Management': 'Sanitation',
    'Road Damage': 'Public Works',
    'Water Supply': 'Water Department',
    Streetlight: 'Electrical',
    General: 'Administration',
  };

  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `Classify this civic complaint into a category and department. Return compact JSON with keys category, department, severity, summary. Complaint title: ${title}. Description: ${description}. Location: ${location}. Severity: ${severity || chosenSeverity}.` }],
          }],
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const textResponse = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = textResponse ? JSON.parse(textResponse.match(/\{[\s\S]*\}/)?.[0] || '{}') : {};

        if (parsed.category && parsed.department) {
          return {
            summary: parsed.summary || `AI-assisted review determined ${String(parsed.category).toLowerCase()} risk near ${location || 'reported location'} with ${String(parsed.severity || chosenSeverity).toLowerCase()} priority.`,
            department: parsed.department,
            severity: parsed.severity || chosenSeverity,
            category: parsed.category,
          };
        }
      }
    } catch {
      // Fall back to the local heuristic below when the remote call is unavailable.
    }
  }

  const impactData = buildImpactScore(title, description, location, chosenSeverity);
  const recommendation = buildRecommendation(category, chosenSeverity, location);

  return {
    summary: `AI-assisted review determined ${category.toLowerCase()} risk near ${location || 'reported location'} with ${chosenSeverity.toLowerCase()} priority.`,
    department: departmentMap[category] || 'Administration',
    severity: chosenSeverity,
    category,
    confidence: 93,
    explainability: `Why AI made this decision: the complaint title, severity, location context, and nearby infrastructure patterns suggest ${category.toLowerCase()} risk with elevated urgency in ${location || 'this area'}.`,
    impactScore: impactData.score,
    impactFactors: impactData.factors,
    recommendation,
    riskPrediction: buildPredictionHistorySnapshot(),
  };
}

function buildAnalytics() {
  const counts = { Pending: 0, Resolved: 0, 'In Review': 0, Assigned: 0, Critical: 0, High: 0, Medium: 0, Low: 0 };
  const categoryCounts = {};
  const dailyReports = [
    { name: 'Mon', reports: 0 },
    { name: 'Tue', reports: 0 },
    { name: 'Wed', reports: 0 },
    { name: 'Thu', reports: 0 },
    { name: 'Fri', reports: 0 },
    { name: 'Sat', reports: 0 },
    { name: 'Sun', reports: 0 },
  ];

  for (const complaint of store.complaints) {
    counts[complaint.status] = (counts[complaint.status] || 0) + 1;
    counts[complaint.severity] = (counts[complaint.severity] || 0) + 1;
    categoryCounts[complaint.category] = (categoryCounts[complaint.category] || 0) + 1;

    const weekday = (new Date(complaint.createdAt).getDay() + 6) % 7;
    dailyReports[weekday].reports += 1;
  }

  const riskPredictions = buildPredictionHistorySnapshot();
  const healthScore = buildHealthScore();

  return {
    stats: [
      { label: 'Pending', value: counts.Pending },
      { label: 'Resolved', value: counts.Resolved },
      { label: 'Critical', value: counts.Critical },
    ],
    dailyReports,
    issueCategories: Object.entries(categoryCounts).map(([name, value]) => ({ name, value })),
    predictions: riskPredictions,
    healthScore,
  };
}

async function saveImageToDisk(imageData, fileName) {
  const matches = imageData.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Unsupported image payload.');
  }

  const extension = matches[1].split('/')[1] || 'png';
  const buffer = Buffer.from(matches[2], 'base64');
  const safeName = sanitizeName(fileName || `upload-${Date.now()}`)
    .replace(/\s+/g, '-')
    .toLowerCase();
  const finalFileName = `${Date.now()}-${safeName}.${extension}`;
  const imagePath = path.join(UPLOAD_DIR, finalFileName);
  await fs.writeFile(imagePath, buffer);
  return `${BASE_URL}/uploads/${finalFileName}`;
}

async function handleAuth(mode, req, res) {
  const { email, password, name, role } = req.body || {};
  try {
    // Minimal logging for debugging: avoid printing raw passwords
    console.log(`[auth:${mode}] incoming payload:`, { email: String(email || '').toLowerCase(), name: String(name || '').slice(0, 64), role: role || 'unspecified', passwordLength: password ? String(password).length : 0 });
  } catch (e) {
    // ignore logging errors
  }
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const existingUser = getUserByEmail(email);
  if (mode === 'signup' && existingUser) {
    return res.status(409).json({ success: false, message: 'Account already exists for this email.' });
  }

  if (mode === 'signup') {
    const user = {
      id: `USR-${Date.now()}`,
      name: name || 'Citizen User',
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      role: role || 'citizen',
    };

    store.users.push(user);
    await persistStore();
    const token = createToken(user);
    return res.status(201).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  const user = existingUser;
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = createToken(user);
  return res.status(200).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CivicMind AI backend is running', timestamp: new Date().toISOString() });
});

app.post('/api/auth/signup', async (req, res) => handleAuth('signup', req, res));
app.post('/api/auth/login', async (req, res) => handleAuth('login', req, res));
app.get('/api/auth/me', (req, res) => {
  const payload = loadUserFromToken(req);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const user = getUserById(payload.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/upload-image', async (req, res) => {
  const { imageData, fileName } = req.body || {};
  if (!imageData) {
    return res.status(400).json({ success: false, message: 'Image data is required.' });
  }

  try {
    const imageUrl = await saveImageToDisk(imageData, fileName || 'complaint-image');
    return res.json({ success: true, imageUrl });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Image upload failed.' });
  }
});

app.get('/api/complaints', (req, res) => {
  const complaints = [...store.complaints]
    .map((item) => enrichComplaint(item))
    .sort((a, b) => (b.supportCount || 0) - (a.supportCount || 0) || new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ success: true, data: complaints });
});

app.post('/api/complaints/:id/support', async (req, res) => {
  const { id } = req.params;
  const complaint = store.complaints.find((item) => item.id === id);
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found.' });
  }

  complaint.supportCount = (complaint.supportCount || 0) + 1;
  complaint.communitySupport = `${complaint.supportCount} citizens supporting`;
  await persistStore();
  return res.json({ success: true, data: enrichComplaint(complaint), message: `${complaint.supportCount} citizens are now supporting this complaint.` });
});

app.post('/api/complaints', async (req, res) => {
  const { title, description, location, severity = 'Medium', imageUrl = '', lat, lng } = req.body || {};

  if (!title || !description || !location) {
    return res.status(400).json({ success: false, message: 'Title, description, and location are required.' });
  }

  const duplicate = detectDuplicateComplaint({ title, description, location, imageUrl });
  if (duplicate) {
    duplicate.supportCount = (duplicate.supportCount || 0) + 1;
    duplicate.communitySupport = `${duplicate.supportCount} citizens supporting`;
    await persistStore();
    return res.status(200).json({
      success: true,
      data: enrichComplaint(duplicate),
      duplicate: true,
      message: 'This issue has already been reported.',
      duplicateSupportCount: duplicate.supportCount,
      duplicateMessage: `Supported by ${duplicate.supportCount} citizens`,
    });
  }

  const ai = await inferAI(title, description, location, severity);
  const complaint = {
    id: createComplaintId(),
    title,
    description,
    category: ai.category,
    severity: ai.severity,
    status: 'Pending',
    location,
    department: ai.department,
    lat: Number(lat) || null,
    lng: Number(lng) || null,
    imageUrl,
    createdAt: new Date().toISOString(),
    supportCount: 1,
    communitySupport: '1 citizen supporting',
    ai,
  };

  store.complaints.unshift(complaint);
  store.notifications.unshift({
    id: `NT-${Date.now()}`,
    message: `New complaint ${complaint.id} received and routed to ${complaint.department}.`,
    type: 'new',
    read: false,
    complaintId: complaint.id,
    createdAt: new Date().toISOString(),
  });

  await persistStore();
  return res.status(201).json({ success: true, data: enrichComplaint(complaint), message: 'Complaint submitted successfully.' });
});

app.put('/api/complaints/:id', async (req, res) => {
  const { id } = req.params;
  const { status, department, severity } = req.body || {};
  const complaint = store.complaints.find((item) => item.id === id);

  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found.' });
  }

  if (status) complaint.status = status;
  if (department) complaint.department = department;
  if (severity) complaint.severity = severity;

  complaint.ai = {
    ...complaint.ai,
    department: complaint.department,
    severity: complaint.severity,
  };

  store.notifications.unshift({
    id: `NT-${Date.now()}`,
    message: `Complaint ${complaint.id} updated to ${complaint.status}.`,
    type: 'update',
    read: false,
    complaintId: complaint.id,
    createdAt: new Date().toISOString(),
  });

  await persistStore();
  return res.json({ success: true, data: complaint, message: 'Complaint updated successfully.' });
});

app.delete('/api/complaints/:id', async (req, res) => {
  const { id } = req.params;
  const beforeCount = store.complaints.length;
  store.complaints = store.complaints.filter((item) => item.id !== id);

  if (store.complaints.length === beforeCount) {
    return res.status(404).json({ success: false, message: 'Complaint not found.' });
  }

  await persistStore();
  return res.json({ success: true, message: 'Complaint deleted successfully.' });
});

app.get('/api/analytics', (req, res) => {
  return res.json({ success: true, data: buildAnalytics() });
});

app.get('/api/notifications', (req, res) => {
  return res.json({ success: true, data: store.notifications, unread: store.notifications.filter((item) => !item.read).length });
});

app.delete('/api/notifications/:id', async (req, res) => {
  const { id } = req.params;
  const beforeCount = store.notifications.length;
  store.notifications = store.notifications.filter((item) => item.id !== id);

  if (store.notifications.length === beforeCount) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  await persistStore();
  return res.json({ success: true, message: 'Notification deleted successfully.' });
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  const notification = store.notifications.find((item) => item.id === id);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  notification.read = true;
  await persistStore();
  return res.json({ success: true, data: notification, unread: store.notifications.filter((item) => !item.read).length });
});

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error.' });
});

export async function startServer(port = PORT) {
  await ensureStorage();
  return app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer(PORT);
}

export { app };
