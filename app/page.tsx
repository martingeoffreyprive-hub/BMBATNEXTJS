"use client";

import React, { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

import {
  FileText, Printer, Plus, Trash2, Save, Settings, Loader2, Key, PenTool,
  CheckCircle, X, Palette, Upload, RotateCcw, Camera, ArrowRight, Sparkles,
  Eye, Minimize2, FolderPlus, ChevronLeft, Package, Folder, FileMinus,
  ClipboardList, AlignLeft, Bot, User, Building2, Clock, Calendar, Users,
  Mail, Copy, BrainCircuit, AlertTriangle, FileDown, Cpu, MapPin, Phone,
  CreditCard, Hash, Maximize,
} from "lucide-react";

// --- CONSTANTS ---
const AVAILABLE_MODELS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3.0 Flash Preview (Expérimental - Nouveau)" },
  { value: "gemini-1.5-pro-002", label: "Gemini 1.5 Pro-002 (Recommandé - Intelligent)" },
  { value: "gemini-1.5-flash-002", label: "Gemini 1.5 Flash-002 (Rapide & Stable)" },
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Expérimental - Très Rapide)" },
  { value: "gemini-2.5-flash-preview-09-2025", label: "Gemini 2.5 Preview (Legacy)" },
  { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash-8B (Ultra Léger)" },
];

// --- UTILS ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(amount || 0);
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

const cleanJsonString = (str: string) => {
  if (!str) return "{}";
  let cleaned = str.replace(/```json/g, "").replace(/```/g, "").trim();
  return cleaned;
};

// --- SYSTEM PROMPTS ---
const PROMPTS: Record<string, string> = {
  DEVIS: `Tu es un Expert Métreur BTP en Belgique.
  MISSION : Générer un dossier complet (Devis + Matériaux + Planning).
  IMPORTANT : La liste "materials" NE DOIT JAMAIS ÊTRE VIDE.
  Structure JSON attendue :
  { "object": "...", "client": { "name": "...", "address": "...", "city": "...", "vat": "BE...", "phone": "...", "role": "..." },
    "site": { "address": "...", "city": "..." },
    "sections": [{ "title": "...", "items": [{ "description": "...", "qty": 1, "unit": "...", "price": 0, "vat": 6 }] }],
    "materials": [{ "category": "...", "name": "...", "qty": "...", "desc": "...", "specs": "..." }],
    "labor": { "totalHours": 0, "estimatedDuration": "...", "teamSize": "...", "breakdown": [{ "trade": "...", "hours": 10 }] }
  }
  Règles TVA Belgique : Rénovation > 10 ans : 6%. Neuf : 21%. Cocontractant : 0%`,
  FACTURE: `Tu es un Expert Comptable en Belgique. Convertis le texte/image en Facture JSON.
  Structure: { object, client: { name, address, city, vat, phone }, site: {}, sections: [{ title, items: [{ description, qty, unit, price, vat }] }] }.
  Règles TVA : Uniquement 0, 6, 12 ou 21.`,
  NOTE_CREDIT: `Tu es un Expert Comptable. Génère une Note de Crédit JSON.
  Structure: { object, client: {}, site: {}, sections: [{ title, items: [{ description, qty, unit, price, vat }] }] }.`,
  RAPPORT: `Tu es un Expert Technique/Architecte en Belgique. Génère un Rapport de Chantier.
  Structure: { object, client: {}, site: {}, sections: [{ title, items: [{ description, qty: 1, unit: "Note", price: 0, vat: 0 }] }] }.`,
};

const AUDIT_SYSTEM_PROMPT = `Tu es un Auditeur de Rentabilité BTP. Analyse le document JSON fourni.
Identifie les incohérences de prix, les erreurs de TVA (Belgique), et les opportunités.
Réponds en JSON : { score: 85, warnings: ["Attention : ..."], opportunities: ["Proposer ..."] }`;

// --- UI COMPONENTS ---
const Card = ({ children, className = "", noPadding = false, onClick }: any) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
  >
    <div className={noPadding ? "" : "p-6"}>{children}</div>
  </div>
);

const AutoResizingTextarea = ({ value, onChange, className, placeholder, rows = 1 }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  };
  useEffect(() => { adjustHeight(); }, [value]);
  return (
    <textarea
      ref={textareaRef} rows={rows}
      className={`${className} overflow-hidden resize-none`}
      value={value} placeholder={placeholder}
      onChange={onChange} onInput={adjustHeight}
    />
  );
};

const Button = ({ children, onClick, color, className = "", icon: Icon, size = "md", disabled = false, variant = "primary" }: any) => {
  const baseStyle = "flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  let sizeClass = "px-5 py-2.5 text-sm";
  if (size === "xs") sizeClass = "px-2 py-1 text-[10px]";
  if (size === "sm") sizeClass = "px-3 py-1.5 text-xs";
  if (size === "lg") sizeClass = "px-6 py-3 text-base";
  let bgStyle: any = {};
  let variantClass = "";
  if (variant === "primary") { bgStyle = { backgroundColor: color, color: "white" }; }
  else if (variant === "ghost") { variantClass = "text-gray-500 hover:bg-gray-100"; }
  else if (variant === "secondary") { variantClass = "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"; }
  else if (variant === "black") { variantClass = "bg-gray-900 text-white hover:bg-black"; }
  return (
    <button onClick={onClick} disabled={disabled} style={bgStyle}
      className={`${baseStyle} ${sizeClass} ${variantClass} ${className}`}>
      {disabled && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
      {!disabled && Icon && <Icon className={`mr-2 ${size === "xs" ? "w-3 h-3" : "w-4 h-4"}`} />}
      {children}
    </button>
  );
};

// --- SIGNATURE PAD ---
const SignaturePad = ({ onSave, onCancel, color }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) { const ctx = canvas.getContext("2d"); if(ctx) { ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "black"; } }
  }, []);
  const getPos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const startDrawing = (e: any) => { const {x,y} = getPos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x,y); setIsDrawing(true); };
  const draw = (e: any) => { if (!isDrawing) return; const {x,y} = getPos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.lineTo(x,y); ctx.stroke(); if (e.touches) e.preventDefault(); };
  const stopDrawing = () => { if (canvasRef.current) canvasRef.current.getContext("2d")!.closePath(); setIsDrawing(false); };
  const handleSave = () => { onSave(canvasRef.current!.toDataURL()); };
  const clearCanvas = () => { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0,0,c.width,c.height); };
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Signature Client</h3>
          <button onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="p-4 bg-gray-100 flex justify-center">
          <canvas ref={canvasRef} width={500} height={250}
            className="bg-white shadow-inner border border-gray-300 rounded cursor-crosshair touch-none"
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
        </div>
        <div className="p-4 flex justify-between items-center">
          <span className="text-xs text-gray-400">Signez dans le cadre blanc</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearCanvas}>Effacer</Button>
            <Button onClick={handleSave} color={color}>Valider</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- LOGO ---
const BmbatOriginalLogo = () => (
  <div className="flex flex-col items-center justify-center w-full h-full">
    <div className="flex font-extrabold tracking-tighter text-2xl">
      <span className="text-green-600">BM</span><span className="text-black">BAT</span>
    </div>
  </div>
);

const BmbatWatermark = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "0%" }}>
    <img src="/watermark.jpg" alt="" style={{ width: "700px", height: "auto", opacity: 0.35, pointerEvents: "none" }} />
  </div>
);

const Logo = ({ brandColor, companyName, logoUrl, size = "medium" }: any) => {
  const sizeClasses: any = { small: "h-8", medium: "h-16", large: "h-24" };
  if (logoUrl) return <div className="flex items-center justify-center"><img src={logoUrl} alt="Logo" className={`${sizeClasses[size]} object-contain max-w-full`} /></div>;
  return (
    <div className="flex items-center gap-3">
      <div className={`${size === "small" ? "h-8 min-w-[2rem]" : size === "medium" ? "h-16 min-w-[4rem]" : "h-24 min-w-[6rem]"} aspect-square rounded-lg flex items-center justify-center text-white font-bold shadow-lg`} style={{ backgroundColor: brandColor }}>
        {companyName.split(" ").map((w: string) => w[0]).join("")}
      </div>
      <div className="flex flex-col">
        <div className={`font-bold text-gray-900 leading-tight ${size === "small" ? "text-sm" : size === "medium" ? "text-lg" : "text-2xl"}`}>{companyName}</div>
        <div className="text-xs text-gray-500 font-medium">CONSTRUCTIONS</div>
      </div>
    </div>
  );
};

// --- INITIAL DATA ---
const getInitialInvoice = (type = "DEVIS"): any => ({
  id: generateId(),
  status: "DRAFT",
  number: `${type.charAt(0)}-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
  date: new Date().toISOString().split("T")[0],
  dueDate: "",
  deposit: 0,
  type: type,
  object: "Nouveau Dossier",
  client: { name: "Nouveau Client", address: "", city: "", email: "", vat: "", phone: "", company: "", role: "" },
  site: { address: "", city: "" },
  sections: [{ id: generateId(), title: "Lot Principal", items: [] }],
  materials: [],
  labor: { totalHours: 0, estimatedDuration: "À calculer", breakdown: [] },
  signature: null,
  lastModified: Date.now(),
});

// --- MAIN PAGE ---
export default function Page() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [savedDocs, setSavedDocs] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try { const s = localStorage.getItem("bmbat_v10_docs"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [apiKey, setApiKey] = useState(() => typeof window !== "undefined" ? localStorage.getItem("bmbat_api_key") || "" : "");
  const [aiModel, setAiModel] = useState(() => typeof window !== "undefined" ? localStorage.getItem("bmbat_ai_model") || "gemini-2.5-flash-preview-09-2025" : "gemini-2.5-flash-preview-09-2025");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMargin, setShowMargin] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState("DEVIS");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [imageInput, setImageInput] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  // Branding States
  const [brandColor, setBrandColor] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_color") || "#5cbd38" : "#5cbd38");
  const [companyName, setCompanyName] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_name") || "BM BAT" : "BM BAT");
  const [companyAddress, setCompanyAddress] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_address") || "Rue de l'Artisanat 12, 1000 Bruxelles" : "");
  const [companyVAT, setCompanyVAT] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_vat") || "BE 0000.000.000" : "");
  const [companyPhone, setCompanyPhone] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_phone") || "+32 400 00 00 00" : "");
  const [companyEmail, setCompanyEmail] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_email") || "info@entreprise.be" : "");
  const [companyIBAN, setCompanyIBAN] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_iban") || "BE00 0000 0000 0000" : "");
  const [logoUrl, setLogoUrl] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_logo") || "" : "");
  const [logoSize, setLogoSize] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_logo_size") || "medium" : "medium");
  const [companyDetailsSize, setCompanyDetailsSize] = useState(() => typeof window !== "undefined" ? localStorage.getItem("brand_details_size") || "small" : "small");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  // Effects for Persistence
  useEffect(() => { localStorage.setItem("bmbat_v10_docs", JSON.stringify(savedDocs)); }, [savedDocs]);
  useEffect(() => { localStorage.setItem("bmbat_api_key", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem("bmbat_ai_model", aiModel); }, [aiModel]);
  useEffect(() => { localStorage.setItem("brand_color", brandColor); }, [brandColor]);
  useEffect(() => { localStorage.setItem("brand_name", companyName); }, [companyName]);
  useEffect(() => { localStorage.setItem("brand_address", companyAddress); }, [companyAddress]);
  useEffect(() => { localStorage.setItem("brand_vat", companyVAT); }, [companyVAT]);
  useEffect(() => { localStorage.setItem("brand_phone", companyPhone); }, [companyPhone]);
  useEffect(() => { localStorage.setItem("brand_email", companyEmail); }, [companyEmail]);
  useEffect(() => { localStorage.setItem("brand_iban", companyIBAN); }, [companyIBAN]);
  useEffect(() => { localStorage.setItem("brand_logo", logoUrl); }, [logoUrl]);
  useEffect(() => { localStorage.setItem("brand_logo_size", logoSize); }, [logoSize]);
  useEffect(() => { localStorage.setItem("brand_details_size", companyDetailsSize); }, [companyDetailsSize]);

  // --- LOGIC ---
  const handleNewDocument = () => { setCurrentDoc(getInitialInvoice("DEVIS")); setActiveTab("editor"); };
  const handleSaveDocument = () => {
    if (!currentDoc) return;
    const updatedDoc = { ...currentDoc, lastModified: Date.now() };
    const index = savedDocs.findIndex((d: any) => d.id === currentDoc.id);
    const newDocs = [...savedDocs];
    if (index >= 0) newDocs[index] = updatedDoc; else newDocs.unshift(updatedDoc);
    setSavedDocs(newDocs); setCurrentDoc(updatedDoc); alert("Dossier sauvegardé !");
  };
  const handleDeleteDocument = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Supprimer ?")) {
      setSavedDocs(savedDocs.filter((d: any) => d.id !== id));
      if (currentDoc && currentDoc.id === id) { setCurrentDoc(null); setActiveTab("dashboard"); }
    }
  };
  const openFolder = (doc: any) => { setCurrentDoc(doc); setActiveTab("folder"); };
  const goBack = () => { if (["editor","materials","planning"].includes(activeTab)) setActiveTab("folder"); else setActiveTab("dashboard"); };

  // Stats
  const getDocStats = (doc: any) => {
    if (!doc) return { ttc: 0, ht: 0, vat: 0, breakdown: {} as any, depositAmount: 0, netToPay: 0 };
    let ht = 0, vat = 0;
    const breakdown: any = {};
    doc.sections.forEach((s: any) => {
      (s.items || []).forEach((i: any) => {
        const lineHT = parseFloat(i.qty || 0) * parseFloat(i.price || 0);
        const rate = parseFloat(i.vat) || 21;
        const lineVAT = lineHT * (rate / 100);
        ht += lineHT; vat += lineVAT;
        if (!breakdown[rate]) breakdown[rate] = { base: 0, tax: 0 };
        breakdown[rate].base += lineHT; breakdown[rate].tax += lineVAT;
      });
    });
    if (doc.type === "NOTE_CREDIT") {
      ht = -Math.abs(ht); vat = -Math.abs(vat);
      Object.keys(breakdown).forEach((r) => { breakdown[r].base = -Math.abs(breakdown[r].base); breakdown[r].tax = -Math.abs(breakdown[r].tax); });
    }
    const ttc = ht + vat;
    const depositAmount = doc.deposit ? ttc * (doc.deposit / 100) : 0;
    const netToPay = doc.type === "DEVIS" ? ttc : ttc - depositAmount;
    return { ht, vat, ttc, breakdown, depositAmount, netToPay };
  };
  const currentStats = getDocStats(currentDoc);

  // IA Functions
  const handleAI = async () => {
    if (!apiKey) return alert("Clé API manquante. Allez dans Paramètres.");
    setLoading(true);
    try {
      const selectedPrompt = PROMPTS[importType] || PROMPTS.DEVIS;
      const contentsParts: any[] = [{ text: selectedPrompt + " Instructions utilisateur: " + (transcript || "Génère le document complet.") }];
      if (imageInput) {
        const base64Data = imageInput.split(",")[1];
        contentsParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: contentsParts }], generationConfig: { responseMimeType: "application/json" } }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const responseText = json.candidates[0].content.parts[0].text;
      const result = JSON.parse(cleanJsonString(responseText));
      const newSections = (result.sections || []).map((s: any) => ({
        id: generateId(), title: s.title || "Section",
        items: (s.items || []).map((it: any) => ({
          id: generateId(), description: it.description, qty: it.qty || 1,
          unit: it.unit || "pce", price: it.price || 0, cost: it.cost_estimate || 0, vat: it.vat || 6,
        })),
      }));
      const baseDoc = getInitialInvoice(importType);
      const newDoc = {
        ...baseDoc, object: result.object || baseDoc.object,
        client: { ...baseDoc.client, ...result.client }, site: { ...baseDoc.site, ...result.site },
        sections: newSections, materials: result.materials || [], labor: result.labor || baseDoc.labor,
      };
      setCurrentDoc(newDoc); setTranscript(""); setImageInput(null); setShowImportModal(false); setActiveTab("editor");
    } catch (e: any) { console.error(e); alert("Erreur IA: " + e.message); }
    finally { setLoading(false); }
  };

  const handleAuditAI = async () => {
    if (!apiKey) return alert("Clé API manquante.");
    setLoading(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: AUDIT_SYSTEM_PROMPT + " Document: " + JSON.stringify(currentDoc.sections) }] }], generationConfig: { responseMimeType: "application/json" } }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const result = JSON.parse(cleanJsonString(json.candidates[0].content.parts[0].text));
      setAuditResult(result); setShowAuditModal(true);
    } catch (e: any) { alert("Erreur IA: " + e.message); }
    finally { setLoading(false); }
  };

  const handleGenerateEmail = async () => {
    if (!apiKey) return alert("Clé API manquante.");
    setLoading(true);
    try {
      const prompt = `Rédige un email professionnel pour envoyer ce ${currentDoc.type} à ${currentDoc.client.name}. Total: ${formatCurrency(currentStats.ttc)}.`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setEmailDraft(json.candidates[0].content.parts[0].text); setShowEmailModal(true);
    } catch (e: any) { alert("Erreur IA: " + e.message); }
    finally { setLoading(false); }
  };

  // --- UPDATE FUNCTIONS ---
  const update = (path: string, val: any) => {
    if (!currentDoc) return;
    const keys = path.split(".");
    if (keys.length === 2) setCurrentDoc({ ...currentDoc, [keys[0]]: { ...currentDoc[keys[0]], [keys[1]]: val } });
    else setCurrentDoc({ ...currentDoc, [path]: val });
  };
  const updateItem = (sId: string, iId: string, field: string, val: any) => {
    const sections = currentDoc.sections.map((s: any) => s.id === sId ? { ...s, items: s.items.map((i: any) => i.id === iId ? { ...i, [field]: val } : i) } : s);
    setCurrentDoc({ ...currentDoc, sections });
  };
  const handleSign = (data: string) => { setCurrentDoc({ ...currentDoc, status: "SIGNED", signature: data, signatureDate: new Date().toISOString().split("T")[0] }); setShowSignaturePad(false); };
  const changeDocType = (newType: string) => {
    let newNumber = currentDoc.number;
    if (currentDoc.number.startsWith("D-") && newType === "FACTURE") newNumber = currentDoc.number.replace("D-", "F-");
    setCurrentDoc({ ...currentDoc, type: newType, number: newNumber });
  };
  const handleLogoUpload = (e: any) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setLogoUrl(reader.result as string); reader.readAsDataURL(file); } };
  const handleImageForAnalysis = (e: any) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setImageInput(reader.result as string); setTranscript("Analyse de l'image..."); }; reader.readAsDataURL(file); } };
  const restoreBmbatIdentity = () => { setBrandColor("#5cbd38"); setCompanyName("BM BAT"); setCompanyAddress("Rue de l'Artisanat 12, 5000 Namur"); setCompanyVAT("BE 0000.000.000"); setCompanyPhone("+32 470 00 00 00"); setCompanyEmail("info@bmbat.be"); setCompanyIBAN("BE00 0000 0000 0000"); setLogoUrl(""); setLogoSize("medium"); setCompanyDetailsSize("small"); alert("Identité BM BAT restaurée !"); };

  const getLogoSizeClasses = (size: string) => { switch(size) { case "small": return "w-32 h-16"; case "large": return "w-64 h-32"; default: return "w-48 h-24"; } };
  const getDetailsSizeClass = (size: string) => { switch(size) { case "medium": return "text-xs"; case "large": return "text-sm"; default: return "text-[9px]"; } };
  const getQrCodeUrl = () => {
    const cleanIBAN = companyIBAN.replace(/s/g, "");
    const amount = currentStats.netToPay.toFixed(2);
    const ref = currentDoc ? currentDoc.number : "";
    const epcString = `BCD${String.fromCharCode(10)}002${String.fromCharCode(10)}1${String.fromCharCode(10)}SCT${String.fromCharCode(10)}${String.fromCharCode(10)}${companyName}${String.fromCharCode(10)}${cleanIBAN}${String.fromCharCode(10)}EUR${amount}${String.fromCharCode(10)}${String.fromCharCode(10)}${String.fromCharCode(10)}${ref}${String.fromCharCode(10)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(epcString)}`;
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-800">

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: brandColor }}><Bot size={20} /> Assistant IA</h2>
              <button onClick={() => setShowImportModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4 bg-gray-50 p-3 rounded-lg border">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Cpu size={12} /> Modèle IA</label>
                <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-full p-2 border rounded-md text-sm bg-white">
                  {AVAILABLE_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="mb-6 flex gap-2 justify-center bg-gray-100 p-1 rounded-lg">
                {["DEVIS", "FACTURE", "NOTE_CREDIT", "RAPPORT"].map((type) => (
                  <button key={type} onClick={() => setImportType(type)}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${importType === type ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-800"}`}>
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
              <div className="mb-4" onClick={() => imageUploadRef.current?.click()}>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                  <input type="file" accept="image/*" ref={imageUploadRef} onChange={handleImageForAnalysis} className="hidden" />
                  {imageInput ? <img src={imageInput} alt="Preview" className="h-32 object-contain rounded-md" /> : <div className="text-center text-gray-400"><Camera className="mx-auto mb-2" /><span className="text-sm">Ajouter photo/plan</span></div>}
                </div>
              </div>
              <textarea className="w-full h-40 p-4 border rounded-lg resize-none focus:outline-none" placeholder={`Instructions pour ${importType}...`} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>Annuler</Button>
              <Button onClick={handleAI} disabled={loading} icon={Loader2} color={brandColor}>{loading ? "Génération..." : "Créer Document"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && auditResult && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-blue-50">
              <h2 className="font-bold text-xl text-blue-900 flex items-center gap-2"><BrainCircuit /> Audit IA</h2>
              <button onClick={() => setShowAuditModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-gray-500">Score</span>
                <span className={`text-2xl font-black ${auditResult.score > 80 ? "text-green-500" : "text-orange-500"}`}>{auditResult.score}/100</span>
              </div>
              {auditResult.warnings?.map((w: string, i: number) => <p key={i} className="text-sm text-red-600 mb-1">{w}</p>)}
              {auditResult.opportunities?.map((w: string, i: number) => <p key={i} className="text-sm text-blue-600 mb-1">{w}</p>)}
            </div>
            <div className="p-4 border-t bg-gray-50 text-center"><Button onClick={() => setShowAuditModal(false)} className="w-full" color={brandColor}>Compris</Button></div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-indigo-50 flex justify-between items-center">
              <h2 className="font-bold text-xl text-indigo-900"><Sparkles size={20} /> Email</h2>
              <button onClick={() => setShowEmailModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6"><textarea className="w-full h-64 p-4 border rounded-lg font-mono text-sm" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} /></div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="secondary" icon={Copy} onClick={() => { navigator.clipboard.writeText(emailDraft); alert("Copié!"); }}>Copier</Button>
              <Button color={brandColor} icon={Mail}>Ouvrir Mail</Button>
            </div>
          </div>
        </div>
      )}

      {showSignaturePad && <SignaturePad onSave={handleSign} onCancel={() => setShowSignaturePad(false)} color={brandColor} />}

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-[#111827] text-white flex-col hidden md:flex sticky top-0 h-screen z-50 no-print">
        <div className="p-6 flex flex-col items-center border-b border-gray-800">
          <div className="bg-white p-2 rounded-xl mb-3 shadow-lg w-full flex items-center justify-center h-20">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /> : <BmbatOriginalLogo />}
          </div>
          <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] hidden lg:block">MANAGER V13</span>
        </div>
        <div className="p-4 space-y-2">
          <button onClick={handleNewDocument} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Plus size={18} /><span className="hidden lg:inline">NOUVEAU</span></button>
          <button onClick={() => setShowImportModal(true)} style={{ backgroundColor: brandColor }} className="w-full text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg"><Bot size={18} /><span className="hidden lg:inline">ASSISTANT IA</span></button>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === "dashboard" || activeTab === "folder" ? "text-white" : "text-gray-400 hover:bg-gray-800"}`} style={activeTab === "dashboard" || activeTab === "folder" ? { backgroundColor: brandColor + "40", border: "1px solid " + brandColor } : {}}>
            <FolderPlus className="w-5 h-5" /><span className="font-medium hidden lg:block">Mes Dossiers</span>
          </button>
          <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === "settings" ? "text-white" : "text-gray-400 hover:bg-gray-800"}`} style={activeTab === "settings" ? { backgroundColor: brandColor + "40", border: "1px solid " + brandColor } : {}}>
            <Settings className="w-5 h-5" /><span className="font-medium hidden lg:block">Paramètres</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative scroll-smooth">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 px-8 py-4 flex justify-between items-center no-print">
          <div className="flex items-center gap-4">
            {activeTab !== "dashboard" && activeTab !== "settings" && <button onClick={goBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><ChevronLeft /></button>}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{activeTab === "dashboard" ? "Mes Dossiers" : activeTab === "settings" ? "Configuration" : currentDoc?.client?.name || "Dossier"}</h1>
              {currentDoc && <div className="text-xs text-gray-400 font-mono">{currentDoc.type} - {currentDoc.number}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["editor","materials","planning"].includes(activeTab) && (
              <>
                {activeTab === "editor" && <>
                  <button onClick={handleGenerateEmail} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-200"><Sparkles size={14} /> Email</button>
                  <button onClick={handleAuditAI} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-200"><BrainCircuit size={16} /> Audit</button>
                </>}
                <Button variant="secondary" icon={Save} onClick={handleSaveDocument}>Sauvegarder</Button>
                {activeTab === "editor" && currentDoc && <>
                  {currentDoc.status === "DRAFT" && <button onClick={() => setShowSignaturePad(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"><PenTool size={16} /> Signer</button>}
                  {currentDoc.type === "FACTURE" && currentDoc.status !== "PAID" && <button onClick={() => update("status", "PAID")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold"><CheckCircle size={16} /> Payer</button>}
                </>}
                <Button icon={Printer} variant="black" onClick={() => window.print()}>Imprimer</Button>
              </>
            )}
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto print:p-0 print:max-w-none print-fit">

          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedDocs.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">Aucun document. Cliquez sur "Nouveau" ou "Assistant IA".</div>}
              {savedDocs.map((doc: any) => (
                <Card key={doc.id} onClick={() => openFolder(doc)} className="cursor-pointer hover:shadow-md relative">
                  <div className="flex justify-between mb-4">
                    <div className={`p-2 rounded-lg ${doc.type === "RAPPORT" ? "bg-purple-100 text-purple-600" : doc.type === "FACTURE" ? "bg-blue-100 text-blue-600" : doc.type === "NOTE_CREDIT" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                      {doc.type === "RAPPORT" ? <ClipboardList size={20} /> : doc.type === "FACTURE" ? <FileText size={20} /> : <Folder size={20} />}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded h-fit ${doc.status === "PAID" ? "bg-green-500 text-white" : "bg-gray-100"}`}>{doc.status === "PAID" ? "PAYÉ" : doc.status}</span>
                  </div>
                  <h3 className="font-bold text-lg truncate">{doc.client.name}</h3>
                  <p className="text-sm text-gray-500 truncate mb-4">{doc.object}</p>
                  <div className="border-t pt-4 flex justify-between text-sm">
                    <span className="text-gray-400">{doc.number}</span>
                    {doc.type !== "RAPPORT" && <span className="font-bold">{formatCurrency(getDocStats(doc).ttc)}</span>}
                  </div>
                  <button onClick={(e) => handleDeleteDocument(doc.id, e)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                </Card>
              ))}
            </div>
          )}

          {/* Folder View */}
          {activeTab === "folder" && currentDoc && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card onClick={() => setActiveTab("editor")} className="hover:border-blue-500 border-2 border-transparent cursor-pointer">
                <div className="flex items-center gap-4"><div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><FileText size={32} /></div><div><h3 className="font-bold text-xl">{currentDoc.type.replace("_", " ")}</h3><p className="text-gray-500">Éditer le document</p></div></div>
              </Card>
              {currentDoc.type !== "RAPPORT" && <>
                <Card onClick={() => setActiveTab("materials")} className="hover:border-orange-500 border-2 border-transparent cursor-pointer">
                  <div className="flex items-center gap-4"><div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><Package size={32} /></div><div><h3 className="font-bold text-xl">Matériaux</h3></div></div>
                </Card>
                <Card onClick={() => setActiveTab("planning")} className="hover:border-purple-500 border-2 border-transparent cursor-pointer">
                  <div className="flex items-center gap-4"><div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><Calendar size={32} /></div><div><h3 className="font-bold text-xl">Planning</h3></div></div>
                </Card>
              </>}
            </div>
          )}

          {/* Editor View */}
          {activeTab === "editor" && currentDoc && (
            <div>
              {/* Type Switcher */}
              <div className="mb-4 flex justify-center no-print">
                <div className="bg-white p-1 rounded-lg border shadow-sm flex gap-1">
                  {["DEVIS", "FACTURE", "NOTE_CREDIT"].map((t) => (
                    <button key={t} onClick={() => changeDocType(t)}
                      className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${currentDoc.type === t ? "text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                      style={currentDoc.type === t ? { backgroundColor: t === "NOTE_CREDIT" ? "#ef4444" : t === "FACTURE" ? "#2563eb" : brandColor } : {}}>
                      {t.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`bg-white shadow-2xl print:shadow-none mx-auto flex flex-col relative ${isCompact ? "p-8 min-h-[297mm]" : "p-12 min-h-[1123px]"}`} style={{ maxWidth: "210mm", borderTop: `8px solid ${currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : currentDoc.type === "FACTURE" ? "#2563eb" : brandColor}` }}>

                <BmbatWatermark />

                {/* Header */}
                <div className="flex justify-between items-start border-b border-gray-100 mb-4 pb-2">
                  <div className="w-2/3 flex items-start gap-4">
                    <div className={getLogoSizeClasses(logoSize) + " flex items-center justify-start"}>
                      {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /> : <Logo brandColor={currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : brandColor} companyName={companyName} size={logoSize} />}
                    </div>
                    <div className={`text-gray-500 pl-3 border-l-2 leading-tight pt-1 ${getDetailsSizeClass(companyDetailsSize)}`} style={{ borderColor: currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : brandColor }}>
                      <strong className="text-black">{companyName}</strong><br />{companyAddress}<br />{companyVAT}<br />{companyPhone} {companyEmail && " | " + companyEmail}
                    </div>
                  </div>
                  <div className="text-right w-1/3 pt-1">
                    <div className="font-extrabold uppercase w-full mb-1 text-2xl" style={{ color: currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : currentDoc.type === "FACTURE" ? "#2563eb" : "black" }}>
                      {currentDoc.type.replace("_", " ")}
                    </div>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex justify-end items-center"><span className="text-gray-400 font-bold mr-2">N°</span><input value={currentDoc.number} onChange={(e) => update("number", e.target.value)} className="font-bold w-24 text-right table-input" /></div>
                      <div className="flex justify-end items-center"><span className="text-gray-400 font-bold mr-2">Date</span><input type="date" value={currentDoc.date} onChange={(e) => update("date", e.target.value)} className="w-24 text-right table-input" /></div>
                    </div>
                  </div>
                </div>

                {/* Client & Chantier */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 border border-gray-100 rounded bg-gray-50/50 print:bg-transparent p-2">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1"><User size={10} /> Client</div>
                    <input placeholder="Nom" className="col-span-2 block w-full font-bold text-black outline-none table-input text-sm" value={currentDoc.client.name} onChange={(e) => update("client.name", e.target.value)} />
                    <input placeholder="Entreprise" className="block w-full outline-none text-gray-600 text-xs table-input" value={currentDoc.client.company || ""} onChange={(e) => update("client.company", e.target.value)} />
                    <input placeholder="Adresse" className="block w-full outline-none text-gray-600 text-xs table-input" value={currentDoc.client.address} onChange={(e) => update("client.address", e.target.value)} />
                    <input placeholder="Ville" className="block w-full outline-none text-gray-600 text-xs table-input" value={currentDoc.client.city} onChange={(e) => update("client.city", e.target.value)} />
                    <input placeholder="TVA" className="block w-full outline-none text-gray-600 text-xs table-input" value={currentDoc.client.vat || ""} onChange={(e) => update("client.vat", e.target.value)} />
                    <input placeholder="Tél / Email" className="block w-full outline-none text-gray-600 text-xs table-input" value={currentDoc.client.phone || ""} onChange={(e) => update("client.phone", e.target.value)} />
                  </div>
                  <div className="flex-1 border rounded p-2" style={{ backgroundColor: (currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : brandColor) + "10", borderColor: (currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : brandColor) + "30" }}>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : brandColor }}><Building2 size={10} /> Chantier</div>
                    <input placeholder="Adresse" className="block w-full outline-none text-gray-800 font-medium text-sm table-input" value={currentDoc.site.address} onChange={(e) => update("site.address", e.target.value)} />
                    <input placeholder="Ville" className="block w-full outline-none text-gray-800 text-xs table-input" value={currentDoc.site.city} onChange={(e) => update("site.city", e.target.value)} />
                  </div>
                </div>

                {/* Objet */}
                <div className="mb-4">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Objet</span>
                  <input className="w-full font-bold text-gray-800 border-b border-gray-200 py-0.5 outline-none text-sm table-input" value={currentDoc.object} onChange={(e) => update("object", e.target.value)} />
                </div>

                {/* Table */}
                <div className="mb-4 flex-grow">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      {currentDoc.type === "RAPPORT" ? (
                        <tr className="border-b-2 border-black"><th className="text-left py-2 text-gray-500 uppercase w-full"><AlignLeft size={14} /> Observations</th></tr>
                      ) : (
                        <tr className="border-b-2 border-black">
                          <th className="text-left py-2 text-gray-500 uppercase" style={{ width: "50%" }}>Description</th>
                          <th className="text-center py-2 text-gray-500 uppercase" style={{ width: "8%" }}>Qté</th>
                          <th className="text-center py-2 text-gray-500 uppercase" style={{ width: "8%" }}>Unité</th>
                          <th className="text-right py-2 text-gray-500 uppercase" style={{ width: "12%" }}>P.U.</th>
                          <th className="text-center py-2 text-gray-500 uppercase" style={{ width: "8%" }}>TVA</th>
                          <th className="text-right py-2 text-gray-500 uppercase" style={{ width: "14%" }}>Total</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {currentDoc.sections.map((section: any) => (
                        <React.Fragment key={section.id}>
                          <tr><td colSpan={currentDoc.type === "RAPPORT" ? 1 : 6} className="pt-4 pb-1">
                            <div className="flex items-center bg-gray-100 px-2 py-0.5 rounded group">
                              <input className="font-bold text-black bg-transparent outline-none flex-1 uppercase text-[10px]" value={section.title} onChange={(e) => { const ns = currentDoc.sections.map((s: any) => s.id === section.id ? { ...s, title: e.target.value } : s); setCurrentDoc({ ...currentDoc, sections: ns }); }} />
                              <button onClick={() => setCurrentDoc({ ...currentDoc, sections: currentDoc.sections.filter((s: any) => s.id !== section.id) })} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 no-print ml-2"><Trash2 size={10} /></button>
                            </div>
                          </td></tr>
                          {section.items.map((item: any) => (
                            <tr key={item.id} className="group break-inside-avoid border-b border-gray-50 hover:bg-gray-50">
                              {currentDoc.type === "RAPPORT" ? (
                                <td className="p-2"><AutoResizingTextarea rows={4} className="w-full bg-transparent outline-none text-sm" value={item.description} placeholder="Observation..." onChange={(e: any) => updateItem(section.id, item.id, "description", e.target.value)} /></td>
                              ) : (
                                <>
                                  <td className="align-top py-1"><AutoResizingTextarea rows={1} className="table-input" value={item.description} onChange={(e: any) => updateItem(section.id, item.id, "description", e.target.value)} /></td>
                                  <td className="align-top py-1"><input type="number" className="table-input text-center" value={item.qty} onChange={(e) => updateItem(section.id, item.id, "qty", parseFloat(e.target.value) || 0)} /></td>
                                  <td className="align-top py-1"><select className="table-select text-[10px]" value={item.unit} onChange={(e) => updateItem(section.id, item.id, "unit", e.target.value)}>
                                    <option value="m²">m²</option><option value="ml">ml</option><option value="m³">m³</option><option value="pce">pce</option><option value="h">h</option><option value="Forfait">Forf.</option><option value="U">U</option><option value="Ens">Ens</option>
                                  </select></td>
                                  <td className="align-top py-1"><input type="number" className="table-input text-right" value={item.price} onChange={(e) => updateItem(section.id, item.id, "price", parseFloat(e.target.value) || 0)} /></td>
                                  <td className="align-top py-1"><select className="table-select text-[10px]" value={item.vat} onChange={(e) => updateItem(section.id, item.id, "vat", parseInt(e.target.value))}>
                                    <option value={6}>6%</option><option value={12}>12%</option><option value={21}>21%</option><option value={0}>0%</option>
                                  </select></td>
                                  <td className="align-top py-1 text-right font-medium">{currentDoc.type === "NOTE_CREDIT" && "-"}{formatCurrency(item.qty * item.price)}</td>
                                </>
                              )}
                              <td className="align-top py-1 text-center no-print"><button onClick={() => setCurrentDoc({ ...currentDoc, sections: currentDoc.sections.map((s: any) => s.id === section.id ? { ...s, items: s.items.filter((i: any) => i.id !== item.id) } : s) })} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button></td>
                            </tr>
                          ))}
                          {/* Add item button */}
                          <tr className="no-print"><td colSpan={currentDoc.type === "RAPPORT" ? 2 : 7} className="pt-1">
                            <button onClick={() => { const ns = currentDoc.sections.map((s: any) => s.id === section.id ? { ...s, items: [...s.items, { id: generateId(), description: "", qty: 1, unit: "pce", price: 0, cost: 0, vat: 21 }] } : s); setCurrentDoc({ ...currentDoc, sections: ns }); }}
                              className="text-[9px] flex items-center gap-1 opacity-50 hover:opacity-100" style={{ color: brandColor }}><Plus size={8} /> {currentDoc.type === "RAPPORT" ? "Paragraphe" : "Ligne"}</button>
                          </td></tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-center mt-4 no-print">
                    <Button variant="secondary" size="xs" onClick={() => setCurrentDoc({ ...currentDoc, sections: [...currentDoc.sections, { id: generateId(), title: "Nouvelle Zone", items: [] }] })} icon={FolderPlus}>{currentDoc.type === "RAPPORT" ? "Nouvelle Zone" : "Nouveau Lot"}</Button>
                  </div>
                </div>

                {/* Totals */}
                {currentDoc.type !== "RAPPORT" && (
                  <div className="flex justify-end break-inside-avoid mt-4 pr-6">
                    <div className="w-64">
                      <div className="text-[9px] text-gray-500 border-b border-gray-200 pb-1 mb-2">
                        {Object.entries(currentStats.breakdown || {}).map(([rate, val]: any) => (
                          <div key={rate} className="flex justify-between"><span>TVA {rate}% ({formatCurrency(val.base)})</span><span>{formatCurrency(val.tax)}</span></div>
                        ))}
                      </div>
                      <div className="flex justify-between mb-0.5 text-xs"><span>Total HT</span><span className="font-bold">{formatCurrency(currentStats.ht)}</span></div>
                      <div className="flex justify-between mb-1 text-xs"><span>Total TVA</span><span className="font-bold">{formatCurrency(currentStats.vat)}</span></div>
                      <div className="flex justify-between border-t border-gray-400 pt-1 mb-2 text-sm font-bold"><span>Total TTC</span><span>{formatCurrency(currentStats.ttc)}</span></div>
                      {currentDoc.type === "DEVIS" ? (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2 font-medium">Acompte 45% : <span className="font-bold text-lg">{formatCurrency(currentStats.ttc * 0.45)}</span></div>
                      ) : (
                        <div className="flex justify-between border-t-2 border-black pt-1 text-lg"><span className="font-extrabold">{currentDoc.type === "NOTE_CREDIT" ? "NET EN VOTRE FAVEUR" : "SOLDE À PAYER"}</span><span className="font-extrabold" style={{ color: currentDoc.type === "NOTE_CREDIT" ? "#ef4444" : brandColor }}>{formatCurrency(currentStats.netToPay)}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Signature & QR */}
                <div className="flex justify-between items-start break-inside-avoid mt-8">
                  <div className="w-48 border border-gray-200 rounded p-2">
                    <div className="text-[9px] uppercase text-gray-400 mb-2">Signature Client</div>
                    {currentDoc.signature ? <div className="text-center"><img src={currentDoc.signature} className="h-12 mx-auto" alt="Signature" /><div className="text-[8px] text-gray-400 mt-1">Signé le {currentDoc.signatureDate}</div></div> : <div className="h-12 bg-gray-50 flex items-center justify-center text-[8px] text-gray-300 italic">Non signé</div>}
                  </div>
                  {currentDoc.type !== "RAPPORT" && currentDoc.type !== "NOTE_CREDIT" && currentStats.ttc > 0 && companyIBAN.length > 5 && (
                    <div className="w-32 border border-gray-200 rounded p-2 flex flex-col items-center">
                      <div className="text-[8px] uppercase text-gray-400 mb-1">Scanner pour payer</div>
                      <img src={getQrCodeUrl()} alt="QR" className="w-16 h-16 object-contain" />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-8 border-t border-gray-100 text-center text-gray-400 text-[8px]">
                  {currentDoc.type === "RAPPORT" ? "Ce document est un rapport technique et ne vaut pas facture." : "Conditions : Acompte 45% à la commande. Solde à réception de facture."}
                  <br />Compte Bancaire : <strong>{companyIBAN}</strong>
                </div>

                {/* CGV */}
                <div className="mt-8 pt-4 border-t text-[7px] text-gray-500 text-justify leading-tight">
                  <p className="font-bold text-[9px] mb-2">CONDITIONS GÉNÉRALES DE VENTE - SRL BM BAT (BE 0781.633.126)</p>
                  <p>Les présentes conditions générales régissent la relation contractuelle entre le client et la SRL BM Bat. Devis valable 30 jours. Acompte 45% à la commande. Factures payables sous 15 jours. Intérêt de retard au taux légal + 3%. Clause pénale de 10% (minimum 125€). Garantie décennale applicable. Tribunal compétent : arrondissement judiciaire du siège social.</p>
                </div>

              </div>
            </div>
          )}

          {/* Materials View */}
          {activeTab === "materials" && currentDoc && (
            <div className="space-y-6">
              <div className="flex justify-between items-end mb-6 no-print">
                <h2 className="text-2xl font-bold">Matériaux : {currentDoc.number}</h2>
                <Button icon={Printer} variant="secondary" onClick={() => window.print()}>Imprimer</Button>
              </div>
              <Card>
                {(currentDoc.materials || []).length === 0 ? <p className="text-gray-400 text-center py-8">Aucun matériau. Lancez l'IA.</p> : (
                  <div className="divide-y">
                    {currentDoc.materials.map((mat: any, idx: number) => (
                      <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div><div className="font-medium">{mat.name}</div>{mat.desc && <div className="text-xs text-gray-500">{mat.desc}</div>}</div>
                        <div className="font-mono font-bold bg-gray-100 px-3 py-1 rounded text-sm">{mat.qty}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Planning View */}
          {activeTab === "planning" && currentDoc && (
            <div className="space-y-6">
              {(!currentDoc.labor || currentDoc.labor.totalHours === 0) ? (
                <Card><p className="text-gray-400 text-center p-12">Lancez l'IA pour calculer le planning.</p></Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-blue-50"><div className="text-3xl font-bold text-blue-700">{currentDoc.labor.totalHours} h</div></Card>
                    <Card className="bg-purple-50"><div className="text-2xl font-bold text-purple-700">{currentDoc.labor.estimatedDuration}</div></Card>
                    <Card className="bg-green-50"><div className="text-2xl font-bold text-green-700">{currentDoc.labor.teamSize || "Standard"}</div></Card>
                  </div>
                  <Card>
                    <h2 className="text-2xl font-bold mb-4 border-b pb-4">Détail Main d'Oeuvre</h2>
                    <table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs"><tr><th className="p-4">Poste</th><th className="p-4 text-right">Heures</th><th className="p-4 text-right">Jours</th></tr></thead>
                      <tbody className="divide-y">{(currentDoc.labor.breakdown || []).map((item: any, i: number) => (<tr key={i}><td className="p-4 font-medium">{item.trade}</td><td className="p-4 text-right font-bold">{item.hours} h</td><td className="p-4 text-right text-gray-500">{(item.hours / 8).toFixed(1)} j</td></tr>))}</tbody>
                    </table>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg"><Palette className="w-5 h-5 inline" style={{ color: brandColor }} /> Identité</h3>
                  <Button variant="ghost" size="sm" icon={RotateCcw} onClick={restoreBmbatIdentity}>Reset</Button>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Logo</label>
                  <div className="flex gap-4">
                    <div className="w-32 h-24 bg-gray-50 border-2 border-dashed rounded flex items-center justify-center">
                      {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-full object-contain" /> : <BmbatOriginalLogo />}
                    </div>
                    <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>Changer</Button>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
                  </div>
                </div>
                <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nom</label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full p-2 border rounded font-bold" /></div>
                <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Adresse</label><input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="w-full p-2 border rounded" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">TVA</label><input value={companyVAT} onChange={(e) => setCompanyVAT(e.target.value)} className="w-full p-2 border rounded font-mono text-sm" /></div>
                  <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">GSM</label><input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="w-full p-2 border rounded font-mono text-sm" /></div>
                </div>
                <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label><input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
                <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">IBAN</label><input value={companyIBAN} onChange={(e) => setCompanyIBAN(e.target.value)} className="w-full p-2 border rounded font-mono" /></div>
                <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Couleur</label>
                  <div className="flex gap-2">
                    {["#5cbd38", "#2563eb", "#dc2626"].map((color) => <button key={color} onClick={() => setBrandColor(color)} className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: color }} />)}
                    <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-8 h-8 rounded-full p-0 border-0 cursor-pointer" />
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4"><Key className="w-5 h-5 inline" style={{ color: brandColor }} /> Clé API IA</h3>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-3 border rounded-lg mb-4" placeholder="Clé API Gemini..." />
                <div className="bg-blue-50 p-4 rounded-lg text-sm mb-4">
                  <p className="font-bold mb-1">Modèle par défaut :</p>
                  <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                    {AVAILABLE_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <Button onClick={() => setActiveTab("dashboard")} color={brandColor} className="w-full">Sauvegarder</Button>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
