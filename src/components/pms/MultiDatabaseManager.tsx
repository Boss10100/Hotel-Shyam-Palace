import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Server,
  HardDrive,
  Cloud,
  Play,
  Copy,
  Check,
  HelpCircle,
  ShieldCheck,
  Globe,
  FileSpreadsheet,
  Code2,
} from 'lucide-react';
import { ExternalDatabaseConfig, ExternalDbProvider, StaffUser } from '../../types/hotel';
import {
  fetchDatabaseConnectors,
  saveDatabaseConnector,
  deleteDatabaseConnector,
  testDatabaseConnector,
  syncDatabaseConnector,
  importDatabaseBackup,
  runExtremeSystemVerification,
  VerificationStepResult,
} from '../../services/db';

interface MultiDatabaseManagerProps {
  staffUser: StaffUser;
}

const SUPABASE_SQL_SNIPPET = `-- Run this once in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS hotel_records (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE hotel_records DISABLE ROW LEVEL SECURITY;`;

const GOOGLE_SHEETS_SCRIPT_SNIPPET = `// Paste in Google Sheets -> Extensions -> Apps Script -> Deploy as Web App (Anyone):
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var payload = JSON.parse(e.postData.contents);
  if (payload.type === 'FULL_SYNC' && payload.records) {
    payload.records.forEach(function(r) {
      sheet.appendRow([new Date(), r.collection, r.docId, JSON.stringify(r.data)]);
    });
  } else if (payload.operations) {
    payload.operations.forEach(function(op) {
      sheet.appendRow([new Date(), op.collection, op.id, JSON.stringify(op.data || {})]);
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const MultiDatabaseManager: React.FC<MultiDatabaseManagerProps> = ({ staffUser }) => {
  const [connectors, setConnectors] = useState<ExternalDatabaseConfig[]>([]);
  const [serverStats, setServerStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Add New Database Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState<ExternalDbProvider>('custom_firebase');
  const [dbName, setDbName] = useState('');
  const [firebaseRawPaste, setFirebaseRawPaste] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebaseApiKey, setFirebaseApiKey] = useState('');
  const [firebaseAppId, setFirebaseAppId] = useState('');
  const [firebaseDatabaseId, setFirebaseDatabaseId] = useState('(default)');

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseTableName, setSupabaseTableName] = useState('hotel_records');

  const [mongoEndpointUrl, setMongoEndpointUrl] = useState('');
  const [mongoApiKey, setMongoApiKey] = useState('');
  const [mongoDataSource, setMongoDataSource] = useState('Cluster0');
  const [mongoDatabaseName, setMongoDatabaseName] = useState('hotel_shyam_palace');
  const [mongoCollectionName, setMongoCollectionName] = useState('hotel_records');

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecretHeader, setWebhookSecretHeader] = useState('');

  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // Extreme System Verification State
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<VerificationStepResult[] | null>(null);
  const [diagnosticAllPassed, setDiagnosticAllPassed] = useState<boolean | null>(null);

  const fileImportRef = useRef<HTMLInputElement | null>(null);

  const loadConnectors = async () => {
    setLoading(true);
    try {
      const data = await fetchDatabaseConnectors();
      setConnectors(data.connectors || []);
      setServerStats(data.serverStats || {});
    } catch (e: any) {
      setStatusBanner({ type: 'error', text: e?.message || 'Failed to load database connectors' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectors();
  }, []);

  // Auto-parse Firebase config snippet if user pastes JSON or JS object
  const handleFirebasePaste = (raw: string) => {
    setFirebaseRawPaste(raw);
    const projectMatch = raw.match(/projectId\s*:\s*["']([^"']+)["']/i) || raw.match(/"projectId"\s*:\s*"([^"]+)"/i);
    const apiKeyMatch = raw.match(/apiKey\s*:\s*["']([^"']+)["']/i) || raw.match(/"apiKey"\s*:\s*"([^"]+)"/i);
    const appIdMatch = raw.match(/appId\s*:\s*["']([^"']+)["']/i) || raw.match(/"appId"\s*:\s*"([^"]+)"/i);
    const dbIdMatch =
      raw.match(/firestoreDatabaseId\s*:\s*["']([^"']+)["']/i) ||
      raw.match(/databaseId\s*:\s*["']([^"']+)["']/i);

    if (projectMatch?.[1]) setFirebaseProjectId(projectMatch[1].trim());
    if (apiKeyMatch?.[1]) setFirebaseApiKey(apiKeyMatch[1].trim());
    if (appIdMatch?.[1]) setFirebaseAppId(appIdMatch[1].trim());
    if (dbIdMatch?.[1]) setFirebaseDatabaseId(dbIdMatch[1].trim());
    if (projectMatch?.[1] && !dbName) {
      setDbName(`My Firebase (${projectMatch[1].trim()})`);
    }
  };

  const handleSaveConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);

    if (!dbName.trim()) {
      setStatusBanner({ type: 'error', text: 'Please enter a label/name for this database.' });
      return;
    }

    if (provider === 'custom_firebase' && (!firebaseProjectId.trim() || !firebaseApiKey.trim())) {
      setStatusBanner({
        type: 'error',
        text: 'Firebase Project ID and Web API Key are required.',
      });
      return;
    }

    if (provider === 'supabase' && (!supabaseUrl.trim() || !supabaseAnonKey.trim())) {
      setStatusBanner({
        type: 'error',
        text: 'Supabase Project URL and API Key are required.',
      });
      return;
    }

    if (provider === 'mongodb_atlas' && (!mongoEndpointUrl.trim() || !mongoApiKey.trim())) {
      setStatusBanner({
        type: 'error',
        text: 'MongoDB Atlas Data API URL and API Key are required.',
      });
      return;
    }

    if (
      (provider === 'custom_rest_webhook' || provider === 'google_sheets_webhook') &&
      !webhookUrl.trim()
    ) {
      setStatusBanner({
        type: 'error',
        text: 'Endpoint / Webhook URL is required.',
      });
      return;
    }

    try {
      setLoading(true);
      const saved = await saveDatabaseConnector({
        name: dbName.trim(),
        provider: provider === 'custom_rest_webhook' ? 'custom_rest_sql' : provider,
        enabled: true,
        firebaseProjectId: firebaseProjectId.trim(),
        firebaseApiKey: firebaseApiKey.trim(),
        firebaseAppId: firebaseAppId.trim(),
        firebaseDatabaseId: firebaseDatabaseId.trim() || '(default)',
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
        supabaseTableName: supabaseTableName.trim() || 'hotel_records',
        mongoEndpointUrl: mongoEndpointUrl.trim(),
        mongoApiKey: mongoApiKey.trim(),
        mongoDataSource: mongoDataSource.trim() || 'Cluster0',
        mongoDatabaseName: mongoDatabaseName.trim() || 'hotel_shyam_palace',
        mongoCollectionName: mongoCollectionName.trim() || 'hotel_records',
        webhookUrl: webhookUrl.trim(),
        webhookSecretHeader: webhookSecretHeader.trim(),
        // Unified fields used by server.ts replication engine:
        endpointUrl:
          provider === 'supabase'
            ? supabaseUrl.trim()
            : provider === 'mongodb_atlas'
            ? mongoEndpointUrl.trim()
            : webhookUrl.trim(),
        apiKey:
          provider === 'supabase'
            ? supabaseAnonKey.trim()
            : provider === 'mongodb_atlas'
            ? mongoApiKey.trim()
            : webhookSecretHeader.trim(),
        tableName:
          provider === 'supabase'
            ? supabaseTableName.trim() || 'hotel_records'
            : mongoCollectionName.trim() || 'hotel_records',
        databaseName: mongoDatabaseName.trim() || 'hotel_shyam_palace',
        dataSource: mongoDataSource.trim() || 'Cluster0',
      });

      await loadConnectors();
      setShowAddForm(false);
      setDbName('');
      setFirebaseRawPaste('');
      setStatusBanner({
        type: 'success',
        text: `Database "${saved.name}" added! Clicking 'Test & Sync' will replicate all hotel records to it.`,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Could not save database connector' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setStatusBanner(null);
    try {
      const res = await testDatabaseConnector(id);
      await loadConnectors();
      setStatusBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Connection test failed' });
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncNow = async (id: string) => {
    setSyncingId(id);
    setStatusBanner(null);
    try {
      const res = await syncDatabaseConnector(id);
      await loadConnectors();
      setStatusBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Sync failed' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDatabaseConnector(id);
      await loadConnectors();
      setStatusBanner({
        type: 'info',
        text: `Removed external database connector "${name}".`,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Delete failed' });
    }
  };

  const handleToggleEnabled = async (conn: ExternalDatabaseConfig) => {
    try {
      await saveDatabaseConnector({
        ...conn,
        enabled: !conn.enabled,
      });
      await loadConnectors();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Update failed' });
    }
  };

  const handleDownloadJsonBackup = () => {
    window.location.href = '/api/db/export';
    setStatusBanner({
      type: 'success',
      text: 'Full Hotel Database JSON backup download started.',
    });
  };

  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const collections = parsed.collections || parsed;
        if (!collections || typeof collections !== 'object') {
          throw new Error('Invalid backup JSON file format');
        }
        setLoading(true);
        await importDatabaseBackup(collections);
        await loadConnectors();
        setStatusBanner({
          type: 'success',
          text: 'Full database backup restored and synced across all storage engines!',
        });
      } catch (err: any) {
        setStatusBanner({
          type: 'error',
          text: `Restore failed: ${err?.message || 'Invalid JSON'}`,
        });
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleRunDiagnostics = async () => {
    setRunningDiagnostic(true);
    setDiagnosticResults(null);
    setDiagnosticAllPassed(null);
    try {
      const outcome = await runExtremeSystemVerification(staffUser);
      setDiagnosticResults(outcome.results);
      setDiagnosticAllPassed(outcome.allPassed);
      await loadConnectors();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Diagnostic check failed' });
    } finally {
      setRunningDiagnostic(false);
    }
  };

  const copySnippet = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const totalServerRecords = Object.values(serverStats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {statusBanner && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
              : statusBanner.type === 'error'
              ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
              : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-medium">{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Built-In Triple-Lock Persistence Status Cards */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Permanent Multi-Engine Storage Architecture (Anti-Data-Loss Guard)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Every Room Booking, Check-In, Check-Out, Photo, Supply & Setting is saved simultaneously to 3 built-in engines + any custom databases you connect below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadJsonBackup}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full JSON</span>
            </button>
            <input
              type="file"
              accept=".json,application/json"
              ref={fileImportRef}
              onChange={handleImportJsonBackup}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileImportRef.current?.click()}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore JSON</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Engine 1: Server Disk Database */}
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">1. Server Disk DB (Primary)</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                LOCKED & ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Saves directly to <code className="text-emerald-300">.hsp-data/database-v3.json</code> on server disk. Immune to browser quota limits and network drops.
            </p>
            <div className="pt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Total Records: <strong className="text-amber-400">{totalServerRecords}</strong>
              </span>
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Rooms: <strong>{serverStats.rooms || 16}</strong>
              </span>
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Bookings: <strong>{serverStats.bookings || 0}</strong>
              </span>
            </div>
          </div>

          {/* Engine 2: Browser IndexedDB */}
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">2. Browser IndexedDB (500MB+)</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Stores high-resolution room & gallery photos locally in <code className="text-amber-300">hsp_browser_idb_v3</code> without hitting the 5MB localStorage limit.
            </p>
            <div className="pt-1 text-[10px] text-emerald-400 font-semibold">
              ✓ Monotonic Timestamp Pinning (Zero Rollback)
            </div>
          </div>

          {/* Engine 3: Built-in Cloud Firestore */}
          <div className="bg-slate-900/90 border border-blue-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">3. Built-in Firebase Cloud</span>
              </div>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-bold">
                AUTO-REPLICA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Project <code className="text-blue-300">kingly-inkwell-k83d0</code>. Automatically syncs in background while preventing stale cloud snapshots from overwriting local saves.
            </p>
            <div className="pt-1 text-[10px] text-blue-300 font-semibold">
              ✓ Oversized Photo Guard (&lt;1MB Firestore Safe)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Extreme System Self-Test (Booking -> Check-In -> Check-Out -> Invoice -> DB) */}
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>Extreme End-to-End Verification (Booking • Check-In • Check-Out • Database Save)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Click to run a live automated test that creates a reservation, checks in the guest, checks out with a GST invoice, verifies Server Disk + IndexedDB persistence, and cleanly restores Room 104.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={runningDiagnostic}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-500/10"
          >
            {runningDiagnostic ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Testing All Flows...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Complete E2E Verification</span>
              </>
            )}
          </button>
        </div>

        {diagnosticResults && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            {diagnosticResults.map((res, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  res.status === 'passed'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                }`}
              >
                {res.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{res.step}</span>
                    <span className="text-[10px] font-mono opacity-75">{res.durationMs}ms</span>
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">{res.detail}</p>
                </div>
              </div>
            ))}
            {diagnosticAllPassed && (
              <div className="sm:col-span-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-center text-xs font-bold text-emerald-300">
                ✓ ALL 4 EXTREME CHECKS PASSED — Room Booking, Check-In, Check-Out, GST Invoice & Permanent Multi-Database Save are 100% Working!
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Custom / External Multi-Database Connectors Hub */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <span>Connect Your Own Database (Multi-Database Support)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect as many external databases as you want — Custom Firebase, Supabase (PostgreSQL), MongoDB Atlas, SQL/REST Webhook, or Google Sheets. All active databases receive live updates simultaneously!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{showGuide ? 'Hide Guide' : 'Kaise Add Karein (Guide)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Database</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Hindi + English Guide ("Kaise Add Karein") */}
        {showGuide && (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-3 text-xs">
            <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span>Apna Khud Ka Database Kaise Add Karein (Step-by-Step Guide):</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white">Option 1: Apna Khud Ka Firebase (Firestore)</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  <li>
                    <a
                      href="https://console.firebase.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 underline"
                    >
                      console.firebase.google.com
                    </a>{' '}
                    par jaakar naya project banayein.
                  </li>
                  <li>
                    <strong>Build &rarr; Firestore Database</strong> mein jaakar database create karein aur <strong>Rules</strong> mein <code className="text-emerald-300">allow read, write: if true;</code> publish kar dein.
                  </li>
                  <li>
                    <strong>Project Settings &rarr; Web App (&lt;/&gt;)</strong> se apna <code className="text-amber-300">firebaseConfig</code> copy karke niche <strong>+ Add New Database</strong> mein paste kar dein!
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white">Option 2: Supabase (PostgreSQL SQL Database)</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  <li>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 underline"
                    >
                      supabase.com
                    </a>{' '}
                    par project banayein aur SQL Editor mein niche diya gaya <code className="text-emerald-300">CREATE TABLE hotel_records</code> SQL run karein.
                  </li>
                  <li>
                    <strong>Project Settings &rarr; API</strong> se <code className="text-amber-300">Project URL</code> aur <code className="text-amber-300">anon / service_role key</code> copy karke yahan add karein.
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white">Option 3: MongoDB Atlas / MySQL / Custom Webhook</p>
                <p className="text-[11px] text-slate-400">
                  Agar aapke paas apna Node.js/PHP/Python server, MySQL/PostgreSQL API ya MongoDB Atlas Data API hai, toh uska URL daal dein. Har save par hotel ka pura JSON data aapke server par real-time POST ho jayega.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white">Option 4: Google Sheets Live Sync</p>
                <p className="text-[11px] text-slate-400">
                  Kisi bhi Google Sheet mein <strong>Extensions &rarr; Apps Script</strong> kholein, hamara script paste karke <strong>Deploy as Web App</strong> karein aur uska URL yahan daal dein. Har booking seedhe Excel/Sheet mein save hogi!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add New Database Form */}
        {showAddForm && (
          <form
            onSubmit={handleSaveConnector}
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm">
                Add & Connect External Database
              </h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Select Database Type (Provider)
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as ExternalDbProvider)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="custom_firebase">
                    🔥 Custom Firebase (Cloud Firestore)
                  </option>
                  <option value="supabase">
                    ⚡ Supabase (PostgreSQL Relational SQL)
                  </option>
                  <option value="mongodb_atlas">
                    🍃 MongoDB Atlas (NoSQL Data API)
                  </option>
                  <option value="custom_rest_webhook">
                    🌐 Custom REST / SQL Server Webhook (Node / PHP / MySQL / Postgres)
                  </option>
                  <option value="google_sheets_webhook">
                    📊 Google Sheets (Apps Script Webhook)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Database Label / Name *
                </label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  placeholder="e.g. Owner Personal Firebase / Backup Supabase DB"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Provider-specific fields */}
            {provider === 'custom_firebase' && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-amber-300 font-semibold mb-1">
                    Quick Auto-Fill: Paste Your `firebaseConfig` Code or JSON Here (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={firebaseRawPaste}
                    onChange={(e) => handleFirebasePaste(e.target.value)}
                    placeholder={`Paste const firebaseConfig = { apiKey: "AIza...", projectId: "my-hotel-db", appId: "1:..." } and fields below will fill automatically!`}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Firebase Project ID *</label>
                    <input
                      type="text"
                      value={firebaseProjectId}
                      onChange={(e) => setFirebaseProjectId(e.target.value)}
                      placeholder="my-hotel-shyam-db"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Firebase Web API Key *</label>
                    <input
                      type="text"
                      value={firebaseApiKey}
                      onChange={(e) => setFirebaseApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Firebase App ID (Optional)</label>
                    <input
                      type="text"
                      value={firebaseAppId}
                      onChange={(e) => setFirebaseAppId(e.target.value)}
                      placeholder="1:123456789:web:abcdef"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Firestore Database ID</label>
                    <input
                      type="text"
                      value={firebaseDatabaseId}
                      onChange={(e) => setFirebaseDatabaseId(e.target.value)}
                      placeholder="(default)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {provider === 'supabase' && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Supabase Project URL *</label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Supabase Anon / Service Key *</label>
                    <input
                      type="text"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Table Name</label>
                    <input
                      type="text"
                      value={supabaseTableName}
                      onChange={(e) => setSupabaseTableName(e.target.value)}
                      placeholder="hotel_records"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Copy & Run This SQL in Supabase SQL Editor:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copySnippet('supabase', SUPABASE_SQL_SNIPPET)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSnippet === 'supabase' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono text-emerald-300 overflow-x-auto">
                    {SUPABASE_SQL_SNIPPET}
                  </pre>
                </div>
              </div>
            )}

            {provider === 'mongodb_atlas' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">MongoDB Atlas Data API Endpoint URL *</label>
                  <input
                    type="text"
                    value={mongoEndpointUrl}
                    onChange={(e) => setMongoEndpointUrl(e.target.value)}
                    placeholder="https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Data API Key *</label>
                  <input
                    type="text"
                    value={mongoApiKey}
                    onChange={(e) => setMongoApiKey(e.target.value)}
                    placeholder="MongoDB Atlas Data API Key"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cluster / DataSource Name</label>
                  <input
                    type="text"
                    value={mongoDataSource}
                    onChange={(e) => setMongoDataSource(e.target.value)}
                    placeholder="Cluster0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Database Name</label>
                  <input
                    type="text"
                    value={mongoDatabaseName}
                    onChange={(e) => setMongoDatabaseName(e.target.value)}
                    placeholder="hotel_shyam_palace"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Collection Name</label>
                  <input
                    type="text"
                    value={mongoCollectionName}
                    onChange={(e) => setMongoCollectionName(e.target.value)}
                    placeholder="hotel_records"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {(provider === 'custom_rest_webhook' || provider === 'google_sheets_webhook') && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      {provider === 'google_sheets_webhook'
                        ? 'Google Apps Script Web App URL *'
                        : 'Custom REST / SQL Webhook Endpoint URL *'}
                    </label>
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder={
                        provider === 'google_sheets_webhook'
                          ? 'https://script.google.com/macros/s/.../exec'
                          : 'https://your-api-domain.com/api/hotel-sync'
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Authorization Bearer Token / Secret (Optional)
                    </label>
                    <input
                      type="text"
                      value={webhookSecretHeader}
                      onChange={(e) => setWebhookSecretHeader(e.target.value)}
                      placeholder="Optional API secret key"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                {provider === 'google_sheets_webhook' && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Copy & Paste into Google Sheets &rarr; Extensions &rarr; Apps Script:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copySnippet('gsheets', GOOGLE_SHEETS_SCRIPT_SNIPPET)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedSnippet === 'gsheets' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Apps Script</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-emerald-300 overflow-x-auto">
                      {GOOGLE_SHEETS_SCRIPT_SNIPPET}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>Save & Connect Database</span>
              </button>
            </div>
          </form>
        )}

        {/* List of User-Connected External Databases */}
        {connectors.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-2">
            <Globe className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs font-bold text-slate-300">
              No Additional External Databases Connected Yet
            </p>
            <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
              Your hotel data is already permanently protected by the 3 Built-In Engines above (Server Disk DB + Browser IndexedDB + Default Firebase). Click <strong>"+ Add New Database"</strong> above if you also want live replication to your own Firebase, Supabase, MongoDB, SQL API, or Google Sheet!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connectors.map((conn) => (
              <div
                key={conn.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{conn.name}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-amber-300 rounded text-[10px] font-mono uppercase">
                      {conn.provider.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (conn.status || conn.lastStatus) === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : (conn.status || conn.lastStatus) === 'error'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {(conn.status || conn.lastStatus) === 'connected'
                        ? 'CONNECTED & SYNCED'
                        : (conn.status || conn.lastStatus) === 'error'
                        ? 'CONNECTION ERROR'
                        : 'READY TO TEST'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {conn.provider === 'custom_firebase' &&
                      `Project: ${conn.firebaseProjectId} • DB: ${conn.firebaseDatabaseId || '(default)'}`}
                    {conn.provider === 'supabase' &&
                      `URL: ${conn.endpointUrl || conn.supabaseUrl} • Table: ${conn.tableName || conn.supabaseTableName || 'hotel_records'}`}
                    {conn.provider === 'mongodb_atlas' &&
                      `DB: ${conn.databaseName || conn.mongoDatabaseName} • Collection: ${conn.tableName || conn.mongoCollectionName}`}
                    {(conn.provider === 'custom_rest_webhook' ||
                      conn.provider === 'custom_rest_sql' ||
                      conn.provider === 'google_sheets_webhook') &&
                      `Endpoint: ${conn.endpointUrl || conn.webhookUrl}`}
                  </p>
                  {conn.lastError && (
                    <p className="text-[11px] text-rose-400">Error: {conn.lastError}</p>
                  )}
                  {(conn.lastSyncedAt || conn.lastSyncAt) && (
                    <p className="text-[10px] text-slate-500">
                      Last Synced: {new Date((conn.lastSyncedAt || conn.lastSyncAt)!).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(conn)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      conn.enabled
                        ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {conn.enabled ? 'Auto-Sync ON' : 'Paused'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTest(conn.id)}
                    disabled={testingId === conn.id}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {testingId === conn.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSyncNow(conn.id)}
                    disabled={syncingId === conn.id}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {syncingId === conn.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Sync All Data Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(conn.id, conn.name)}
                    className="p-1.5 bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Remove Database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
