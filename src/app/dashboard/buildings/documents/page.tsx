"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FolderPlus,
  FolderOpen,
  FileText,
  Upload,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Eye,
  ChevronLeft,
  FolderInput,
  Check,
  Search,
  RotateCcw,
} from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

const BUCKET = "building-documents";

interface BuildingFolder {
  id: string;
  building_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
}

interface BuildingDocument {
  id: string;
  building_id: string;
  folder_id: string | null;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

/** مجلدات افتراضية لمكتب هندسي — تتبع تسلسل العمل من التصميم إلى التنفيذ والتراخيص */
const DEFAULT_FOLDER_NAMES = [
  "1- النموذج الإنشائي للأساسات",
  "2- مذكرة حساب التصميم الإنشائي",
  "3- استبيان مراجعة التصميم",
  "4- المخططات المعمارية",
  "5- مخططات التنفيذ",
  "6- المخطط الرئيسي",
  "7- بند الكميات",
  "8- تقرير التربة",
  "9- كروكي الواجهات",
  "10- المخططات الكهربائية والسباكة",
  "PDF تنفيذي",
  "نماذج كروكيات غير معتمدة",
  "مراسلات واعتمادات المكتب",
  "مستندات تراخيص البناء والهدم",
];

function isPdf(type: string | null, fileName: string): boolean {
  if (type?.toLowerCase()?.includes("pdf")) return true;
  return fileName?.toLowerCase()?.endsWith(".pdf") ?? false;
}

/** إخفاء الترقيم من أول الاسم للعرض فقط (مثل "1- " أو "10- ") */
function stripNumbering(name: string): string {
  return name.replace(/^\d+-\s*/, "");
}

export default function BuildingDocumentsPage() {
  const searchParams = useSearchParams();
  const buildingId = searchParams.get("buildingId") || searchParams.get("id");
  const { can, ready } = useDashboardAuth();
  const [building, setBuilding] = useState<{ id: string; name: string } | null>(null);
  const [folders, setFolders] = useState<BuildingFolder[]>([]);
  const [documents, setDocuments] = useState<BuildingDocument[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [renameFolder, setRenameFolder] = useState<BuildingFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [addFolderName, setAddFolderName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<BuildingDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "folder"; folder: BuildingFolder } | { type: "document"; doc: BuildingDocument } | null>(null);
  const [moveFolder, setMoveFolder] = useState<BuildingFolder | null>(null);
  const [moveDocument, setMoveDocument] = useState<BuildingDocument | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [allBuildingDocuments, setAllBuildingDocuments] = useState<BuildingDocument[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [docMenuPlacement, setDocMenuPlacement] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoringDefault, setRestoringDefault] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const supabase = createClient();

  /** وضع القائمة مرن: فوق/تحت/يمين/يسار حسب المساحة في الشاشة (fixed + إحداثيات محسوبة) */
  const openDocMenu = (docId: string, ev: React.MouseEvent) => {
    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const menuW = 200;
    const menuH = 160;
    const w = typeof window !== "undefined" ? window.innerWidth : 0;
    const h = typeof window !== "undefined" ? window.innerHeight : 0;
    const gap = 4;
    let top: number;
    if (rect.bottom + menuH + gap <= h) {
      top = rect.bottom + gap;
    } else if (rect.top - menuH - gap >= 0) {
      top = rect.top - menuH - gap;
    } else {
      top = Math.max(gap, Math.min(rect.bottom + gap, h - menuH - gap));
    }
    let left: number | undefined;
    let right: number | undefined;
    if (rect.left + menuW <= w && rect.left >= 0) {
      left = rect.left;
    } else if (rect.right - menuW >= 0) {
      right = w - rect.right;
    } else {
      left = Math.max(0, Math.min(rect.left, w - menuW));
    }
    setDocMenuPlacement({ top, ...(right != null ? { right } : { left: left ?? 0 }) });
    setMenuOpen(menuOpen === docId ? null : docId);
  };

  const canAccess = ready && can("details_engineering");
  const canUpload = can("documents_upload");
  const canEditFolders = can("documents_edit_folders");
  const canCreateFolder = can("documents_create_folder") && canEditFolders;
  const canDelete = can("documents_delete");

  const loadBuilding = useCallback(async () => {
    if (!buildingId) return;
    const { data } = await supabase
      .from("buildings")
      .select("id, name")
      .eq("id", buildingId)
      .single();
    setBuilding(data || null);
  }, [buildingId, supabase]);

  const loadFolders = useCallback(async () => {
    if (!buildingId) return;
    const { data, error } = await supabase
      .from("building_folders")
      .select("id, building_id, parent_id, name, sort_order")
      .eq("building_id", buildingId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (!error) setFolders(data || []);
  }, [buildingId, supabase]);

  const loadDocuments = useCallback(async () => {
    if (!buildingId) return;
    let q = supabase
      .from("building_documents")
      .select("id, building_id, folder_id, file_name, storage_path, file_type, file_size, created_at")
      .eq("building_id", buildingId);
    if (currentFolderId === null) {
      q = q.is("folder_id", null);
    } else {
      q = q.eq("folder_id", currentFolderId);
    }
    const { data, error } = await q.order("created_at", { ascending: false });
    if (!error) setDocuments(data || []);
  }, [buildingId, currentFolderId, supabase]);

  const loadAllDocumentsForBuilding = useCallback(async () => {
    if (!buildingId) return;
    const { data: allData, error } = await supabase
      .from("building_documents")
      .select("id, building_id, folder_id, file_name, storage_path, file_type, file_size, created_at")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });
    if (!error) setAllBuildingDocuments(allData || []);
  }, [buildingId, supabase]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setAllBuildingDocuments([]);
      return;
    }
    if (allBuildingDocuments.length > 0) return;
    let cancelled = false;
    setSearchLoading(true);
    loadAllDocumentsForBuilding().then(() => {
      if (!cancelled) setSearchLoading(false);
    });
    return () => { cancelled = true; };
  }, [searchQuery.trim(), loadAllDocumentsForBuilding, allBuildingDocuments.length]);

  /** مسار المجلد كنص (للعرض في نتائج البحث) */
  const getFolderPathString = useCallback((folderId: string | null): string => {
    if (!folderId) return "الرئيسية";
    const path: string[] = [];
    let id: string | null = folderId;
    while (id) {
      const f = folders.find((x) => x.id === id);
      if (!f) break;
path.unshift(stripNumbering(f.name));
    id = f.parent_id;
    }
    return path.length ? path.join(" › ") : "الرئيسية";
  }, [folders]);

  useEffect(() => {
    if (!buildingId || !canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadBuilding().then(() => setLoading(false));
  }, [buildingId, canAccess, loadBuilding]);

  useEffect(() => {
    if (!buildingId || !canAccess) return;
    loadFolders();
  }, [buildingId, canAccess, loadFolders]);

  useEffect(() => {
    if (!buildingId || !canAccess) return;
    loadDocuments();
  }, [buildingId, canAccess, currentFolderId, loadDocuments]);

  const currentFolder = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)
    : null;
  const childFolders = folders.filter(
    (f) => (f.parent_id ?? null) === currentFolderId
  );

  const isSearchMode = searchQuery.trim().length >= 2;
  const searchFilteredDocs = isSearchMode
    ? allBuildingDocuments.filter((d) =>
        d.file_name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : [];
  const displayedDocuments = isSearchMode ? searchFilteredDocs : documents;

  /** مسار المجلدات من الرئيسية إلى المجلد الحالي (للـ breadcrumb) */
  const folderPathToCurrent = ((): BuildingFolder[] => {
    if (!currentFolderId) return [];
    const path: BuildingFolder[] = [];
    let id: string | null = currentFolderId;
    while (id) {
      const f = folders.find((x) => x.id === id);
      if (!f) break;
      path.unshift(f);
      id = f.parent_id;
    }
    return path;
  })();

  const createFolder = async (parentId: string | null, name: string) => {
    if (!buildingId || !name.trim()) return;
    const maxOrder = folders
      .filter((f) => (f.parent_id ?? null) === parentId)
      .reduce((acc, f) => Math.max(acc, f.sort_order), 0);
    const { error } = await supabase.from("building_folders").insert({
      building_id: buildingId,
      parent_id: parentId,
      name: name.trim(),
      sort_order: maxOrder + 1,
    });
    if (!error) {
      setAddFolderName("");
      setShowAddFolder(false);
      loadFolders();
    }
  };

  const createDefaultFolders = async () => {
    if (!buildingId) return;
    setCreatingDefault(true);
    for (let i = 0; i < DEFAULT_FOLDER_NAMES.length; i++) {
      await supabase.from("building_folders").insert({
        building_id: buildingId,
        parent_id: null,
        name: DEFAULT_FOLDER_NAMES[i],
        sort_order: i + 1,
      });
    }
    setCreatingDefault(false);
    loadFolders();
  };

  /** استعادة المجلدات الافتراضية المحذوفة فقط (فارغة) بنفس الترتيب */
  const restoreDefaultFolders = async () => {
    if (!buildingId) return;
    setRestoringDefault(true);
    const rootFolders = folders.filter((f) => f.parent_id === null);
    const existingNames = new Set(rootFolders.map((f) => f.name));
    for (let i = 0; i < DEFAULT_FOLDER_NAMES.length; i++) {
      const name = DEFAULT_FOLDER_NAMES[i];
      if (!existingNames.has(name)) {
        await supabase.from("building_folders").insert({
          building_id: buildingId,
          parent_id: null,
          name,
          sort_order: i + 1,
        });
      }
    }
    setRestoringDefault(false);
    setRestoreConfirmOpen(false);
    loadFolders();
  };

  const executeBulkDelete = async () => {
    const docIdsToDelete = new Set(selectedDocumentIds);
    for (const folderId of selectedFolderIds) {
      const docsInFolder = documents.filter((d) => d.folder_id === folderId);
      docsInFolder.forEach((d) => docIdsToDelete.add(d.id));
    }
    for (const id of docIdsToDelete) {
      const doc = documents.find((d) => d.id === id);
      if (doc) {
        await supabase.storage.from(BUCKET).remove([doc.storage_path]);
        await supabase.from("building_documents").delete().eq("id", id);
      }
    }
    for (const id of selectedFolderIds) {
      await supabase.from("building_folders").delete().eq("id", id);
    }
    setSelectedFolderIds(new Set());
    setSelectedDocumentIds(new Set());
    setConfirmBulkDeleteOpen(false);
    loadFolders();
    loadDocuments();
  };

  const updateFolderName = async () => {
    if (!renameFolder || !newFolderName.trim()) return;
    const { error } = await supabase
      .from("building_folders")
      .update({ name: newFolderName.trim(), updated_at: new Date().toISOString() })
      .eq("id", renameFolder.id);
    if (!error) {
      setRenameFolder(null);
      setNewFolderName("");
      loadFolders();
    }
  };

  const openDeleteFolderModal = (folder: BuildingFolder) => {
    setConfirmDelete({ type: "folder", folder });
    setMenuOpen(null);
  };

  const openDeleteDocumentModal = (doc: BuildingDocument) => {
    setConfirmDelete({ type: "document", doc });
    setMenuOpen(null);
  };

  const closeConfirmModal = () => setConfirmDelete(null);

  /** مجلدات يمكن نقل المجلد المحدد إليها (لا نقل إلى نفسه أو داخل أحد فروعه) */
  const getFolderMoveTargets = (folder: BuildingFolder) => {
    const isDescendant = (f: BuildingFolder, ofId: string): boolean => {
      if (f.parent_id === ofId) return true;
      const parent = folders.find((x) => x.id === f.parent_id);
      return parent ? isDescendant(parent, ofId) : false;
    };
    return folders.filter((f) => f.id !== folder.id && !isDescendant(folder, f.id));
  };

  const moveFolderTo = async (folder: BuildingFolder, newParentId: string | null) => {
    const maxOrder = folders
      .filter((f) => (f.parent_id ?? null) === newParentId)
      .reduce((acc, f) => Math.max(acc, f.sort_order), 0);
    const { error } = await supabase
      .from("building_folders")
      .update({ parent_id: newParentId, sort_order: maxOrder + 1 })
      .eq("id", folder.id);
    if (!error) {
      setMoveFolder(null);
      loadFolders();
      if (currentFolderId === folder.id) setCurrentFolderId(newParentId);
    }
  };

  const moveDocumentTo = async (doc: BuildingDocument, newFolderId: string | null) => {
    const { error } = await supabase.from("building_documents").update({ folder_id: newFolderId }).eq("id", doc.id);
    if (!error) {
      setMoveDocument(null);
      loadDocuments();
    }
  };

  const executeConfirmDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "folder") {
      const { error } = await supabase.from("building_folders").delete().eq("id", confirmDelete.folder.id);
      if (!error) {
        if (currentFolderId === confirmDelete.folder.id) setCurrentFolderId(null);
        loadFolders();
        loadDocuments();
      }
    } else {
      await supabase.storage.from(BUCKET).remove([confirmDelete.doc.storage_path]);
      await supabase.from("building_documents").delete().eq("id", confirmDelete.doc.id);
      loadDocuments();
      if (previewDoc?.id === confirmDelete.doc.id) closePreview();
    }
    closeConfirmModal();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !buildingId) return;
    setUploading(true);
    const folderPath = currentFolderId || "root";
    for (const file of Array.from(files)) {
      const path = `${buildingId}/${folderPath}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) continue;
      await supabase.from("building_documents").insert({
        building_id: buildingId,
        folder_id: currentFolderId,
        file_name: file.name,
        storage_path: path,
        file_type: file.type || null,
        file_size: file.size,
      });
    }
    setUploading(false);
    e.target.value = "";
    loadDocuments();
  };

  /** جلب الملف كـ blob من التخزين (يتجنب CORS ويعمل للمعاينة والتحميل) */
  const downloadBlob = async (doc: BuildingDocument): Promise<Blob | null> => {
    const { data, error } = await supabase.storage.from(BUCKET).download(doc.storage_path);
    return error ? null : data;
  };

  const getSignedUrl = async (doc: BuildingDocument): Promise<string> => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 3600);
    return data?.signedUrl ?? "";
  };

  const openPreview = async (doc: BuildingDocument) => {
    setPreviewLoading(doc.id);
    try {
      if (!isPdf(doc.file_type, doc.file_name)) {
        const url = await getSignedUrl(doc);
        if (url) window.open(url, "_blank");
        return;
      }
      const blob = await downloadBlob(doc);
      if (!blob) return;
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewDoc(doc);
    } finally {
      setPreviewLoading(null);
    }
  };

  const closePreview = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const handleDownload = async (doc: BuildingDocument) => {
    setDownloadLoading(doc.id);
    try {
      const blob = await downloadBlob(doc);
      if (!blob) return;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = doc.file_name || "download";
      a.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloadLoading(null);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <p className="text-slate-600">ليس لديك صلاحية لعرض مستندات العمارة.</p>
      </div>
    );
  }
  if (!buildingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <p className="text-slate-600">يرجى اختيار عمارة من تفاصيل المبنى.</p>
        <Link href="/dashboard/buildings" className="mr-4 text-teal-600 underline">
          العمارات
        </Link>
      </div>
    );
  }
  if (loading && !building) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-sky-50/40 p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800 truncate">
                خرائط ومستندات العمارة — {building?.name ?? buildingId}
              </h1>
              <p className="text-sm text-slate-500">مجلدات وملفات المشروع</p>
            </div>
          </div>
          <Link
            href={`/dashboard/buildings/details?buildingId=${buildingId}#card-engineering`}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors flex-shrink-0"
            title="رجوع إلى تفاصيل المبنى"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </header>

        {/* Breadcrumb — مسار المجلدات بالكامل + منطقة إفلات عند السحب */}
        <nav className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <span
            className={`inline-flex items-center rounded-lg px-2 py-1 transition-colors ${currentFolderId && dragOverId === "root" ? "bg-teal-100 ring-1 ring-teal-300" : ""}`}
            onDragOver={(e) => {
              if (!currentFolderId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverId("root");
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverId(null);
              if (!currentFolderId) return;
              const raw = e.dataTransfer.getData("application/json");
              if (!raw) return;
              try {
                const d = JSON.parse(raw);
                if (d.type === "document" && d.id) {
                  const doc = documents.find((x) => x.id === d.id);
                  if (doc) moveDocumentTo(doc, null);
                } else if (d.type === "folder" && d.id) {
                  const folderToMove = folders.find((x) => x.id === d.id);
                  if (folderToMove) moveFolderTo(folderToMove, null);
                }
              } catch (_) {}
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className="text-teal-600 hover:underline"
            >
              الرئيسية
            </button>
          </span>
          {folderPathToCurrent.map((f) => (
            <span key={f.id} className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 flex-shrink-0" />
              {f.id === currentFolderId ? (
                <span className="text-slate-800 font-medium">{stripNumbering(f.name)}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(f.id)}
                  className="text-teal-600 hover:underline"
                >
                  {stripNumbering(f.name)}
                </button>
              )}
            </span>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
          {canCreateFolder && folders.filter((f) => f.parent_id === null).length === 0 && (
            <button
              type="button"
              onClick={createDefaultFolders}
              disabled={creatingDefault}
              className="px-4 py-2 bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium hover:bg-amber-200 disabled:opacity-50"
            >
              {creatingDefault ? "جاري الإنشاء…" : "إنشاء مجلدات المشروع"}
            </button>
          )}
          {canCreateFolder && (() => {
            const rootNames = new Set(folders.filter((f) => f.parent_id === null).map((f) => f.name));
            const hasMissingDefault = DEFAULT_FOLDER_NAMES.some((name) => !rootNames.has(name));
            return rootNames.size > 0 && hasMissingDefault;
          })() && (
            <button
              type="button"
              onClick={() => setRestoreConfirmOpen(true)}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="استعادة تنظيم الملفات"
              aria-label="استعادة تنظيم الملفات"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {canUpload && (
            <label className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-teal-700 inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              رفع ملفات
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          )}
          {canCreateFolder && !showAddFolder ? (
            <button
              type="button"
              onClick={() => setShowAddFolder(true)}
              className="px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-50 inline-flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              مجلد جديد
            </button>
          ) : canCreateFolder ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={addFolderName}
                onChange={(e) => setAddFolderName(e.target.value)}
                placeholder="اسم المجلد"
                className="px-3 py-2 border border-teal-200 rounded-xl text-sm"
                onKeyDown={(e) => e.key === "Enter" && createFolder(currentFolderId, addFolderName)}
              />
              <button
                type="button"
                onClick={() => createFolder(currentFolderId, addFolderName)}
                className="px-3 py-2 bg-teal-600 text-white rounded-xl text-sm"
              >
                إنشاء
              </button>
              <button
                type="button"
                onClick={() => setShowAddFolder(false)}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm"
              >
                إلغاء
              </button>
            </div>
          ) : null}
          </div>
          <div className="flex items-center min-w-0 flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-slate-300">
            <span className="flex items-center justify-center w-10 h-10 flex-shrink-0 text-slate-400 pointer-events-none" aria-hidden>
              <Search className="w-4 h-4" />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في كل الملفات والمجلدات…"
              className="flex-1 min-w-0 py-2.5 pe-2 ps-0 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent border-0"
              aria-label="بحث في الملفات"
            />
          </div>
        </div>

        {/* Rename form */}
        {renameFolder && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              onKeyDown={(e) => e.key === "Enter" && updateFolderName()}
            />
            <button type="button" onClick={updateFolderName} className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm">
              حفظ
            </button>
            <button type="button" onClick={() => setRenameFolder(null)} className="px-3 py-2 bg-slate-200 rounded-lg text-sm">
              إلغاء
            </button>
          </div>
        )}

        {/* شريط حذف المحدد */}
        {(selectedFolderIds.size > 0 || selectedDocumentIds.size > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <span className="text-sm font-medium text-teal-800">
              محدّد: {selectedFolderIds.size} مجلد، {selectedDocumentIds.size} ملف
            </span>
            <div className="flex items-center gap-2">
              {((selectedFolderIds.size > 0 && canEditFolders && canDelete) || (selectedDocumentIds.size > 0 && canDelete)) && (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDeleteOpen(true)}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 inline-block ml-1 align-middle" /> حذف المحدد
                </button>
              )}
              <button
                type="button"
                onClick={() => { setSelectedFolderIds(new Set()); setSelectedDocumentIds(new Set()); }}
                className="px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-50"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        )}

        {/* Folders */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {childFolders.map((f, index) => (
            <div
              key={f.id}
              draggable={canCreateFolder}
              onDragStart={(e) => {
                if (!canCreateFolder) return;
                e.dataTransfer.setData("application/json", JSON.stringify({ type: "folder", id: f.id }));
                e.dataTransfer.effectAllowed = "move";
              }}
              className={`relative group rounded-xl border p-4 pt-3 shadow-sm transition-all min-h-[100px] flex flex-col ${selectedFolderIds.has(f.id) ? "border-teal-500 bg-teal-50/80 ring-2 ring-teal-300" : dragOverId === f.id ? "border-teal-400 bg-teal-50 ring-2 ring-teal-300" : "border-teal-100 bg-white hover:border-teal-200"}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverId(f.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverId(null);
                const raw = e.dataTransfer.getData("application/json");
                if (!raw) return;
                try {
                  const d = JSON.parse(raw);
                  if (d.type === "document" && d.id) {
                    const doc = documents.find((x) => x.id === d.id);
                    if (doc) moveDocumentTo(doc, f.id);
                  } else if (d.type === "folder" && d.id) {
                    const folderToMove = folders.find((x) => x.id === d.id);
                    if (folderToMove && folderToMove.id !== f.id) {
                      const valid = getFolderMoveTargets(folderToMove);
                      if (valid.some((t) => t.id === f.id)) moveFolderTo(folderToMove, f.id);
                    }
                  }
                } catch (_) {}
              }}
            >
              {/* صف الأيقونات: تحديد (إن وُجد) + النقاط الثلاث — بدون تداخل مع المحتوى */}
              <div className="flex items-center justify-between gap-1 min-h-[28px] flex-shrink-0 z-10">
                {selectedFolderIds.size > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFolderIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(f.id)) next.delete(f.id);
                        else next.add(f.id);
                        return next;
                      });
                    }}
                    className="p-1 rounded-md hover:bg-slate-100 transition-colors text-slate-500"
                    aria-label={selectedFolderIds.has(f.id) ? "إلغاء التحديد" : "تحديد"}
                  >
                    {selectedFolderIds.has(f.id) ? (
                      <Check className="w-4 h-4 text-teal-600" />
                    ) : (
                      <span className="block w-4 h-4 rounded border border-slate-300 bg-white" />
                    )}
                  </button>
                ) : (
                  <span className="w-6" aria-hidden />
                )}
                <button
                  type="button"
                  className="p-1.5 rounded-lg opacity-80 group-hover:opacity-100 hover:bg-slate-100 transition-opacity text-slate-500 hover:text-slate-700"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === f.id ? null : f.id); }}
                  aria-label="خيارات المجلد"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              {/* المحتوى: أيقونة المجلد (مع الرقم التسلسلي) + الاسم */}
              <button
                type="button"
                className="flex-1 z-0 w-full flex flex-col items-center justify-center gap-2 text-right rounded-b-xl min-h-0 -m-1 p-1"
                onClick={() => setCurrentFolderId(f.id)}
              >
                <span className="relative inline-flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-9 h-9 text-teal-500" />
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[2.5px] text-[10px] font-bold text-teal-600 tabular-nums">
                    {index + 1}
                  </span>
                </span>
                <span className="text-sm font-medium text-slate-800 truncate w-full">{stripNumbering(f.name)}</span>
              </button>
              {/* القائمة المنسدلة تُعرض فوق المحتوى */}
              {menuOpen === f.id && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setMenuOpen(null)} aria-hidden />
                  <div className="absolute left-0 top-8 z-[100] bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[180px]">
                    {canEditFolders && (
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-right"
                        onClick={() => {
                          setRenameFolder(f);
                          setNewFolderName(f.name);
                          setMenuOpen(null);
                        }}
                      >
                        <Pencil className="w-4 h-4" /> إعادة تسمية
                      </button>
                    )}
                    {canDelete && canEditFolders && (
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-right"
                        onClick={() => { openDeleteFolderModal(f); setMenuOpen(null); }}
                      >
                        <Trash2 className="w-4 h-4" /> حذف
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-right"
                      onClick={() => {
                        setSelectedFolderIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(f.id)) next.delete(f.id);
                          else next.add(f.id);
                          return next;
                        });
                        setMenuOpen(null);
                      }}
                    >
                      <Check className="w-4 h-4" /> {selectedFolderIds.has(f.id) ? "إلغاء التحديد" : "تحديد"}
                    </button>
                    {canCreateFolder && (
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-right"
                        onClick={() => { setMoveFolder(f); setMenuOpen(null); }}
                      >
                        <FolderInput className="w-4 h-4" /> نقل
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Files */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
            الملفات
          </div>
          <ul className="divide-y divide-slate-100">
            {searchLoading && isSearchMode && (
              <li className="px-4 py-6 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                جاري البحث…
              </li>
            )}
            {!searchLoading && isSearchMode && displayedDocuments.length === 0 && (
              <li className="px-4 py-8 text-center text-slate-500 text-sm">
                لا توجد نتائج لـ &quot;{searchQuery.trim()}&quot;
              </li>
            )}
            {!searchLoading && !isSearchMode && documents.length === 0 && (
              <li className="px-4 py-8 text-center text-slate-500 text-sm">
                لا توجد ملفات في هذا المجلد. استخدم &quot;رفع ملفات&quot; لإضافة PDF أو غيرها.
              </li>
            )}
            {!searchLoading && displayedDocuments.map((doc) => (
              <li
                key={doc.id}
                draggable={canCreateFolder}
                onDragStart={(e) => {
                  if (!canCreateFolder) return;
                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "document", id: doc.id }));
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`flex items-center gap-3 px-4 py-3 group rounded-lg border ${selectedDocumentIds.has(doc.id) ? "bg-teal-50/80 border-teal-300 ring-1 ring-teal-200" : "hover:bg-slate-50 border-transparent"}`}
              >
                {selectedDocumentIds.has(doc.id) ? <Check className="w-5 h-5 text-teal-600 flex-shrink-0" /> : <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate block">{doc.file_name}</span>
                  {isSearchMode && (
                    <span className="text-xs text-slate-500 truncate block" title={getFolderPathString(doc.folder_id)}>
                      {getFolderPathString(doc.folder_id)}
                    </span>
                  )}
                  {doc.file_size != null && (
                    <span className="text-xs text-slate-500">
                      {(doc.file_size / 1024).toFixed(1)} ك.ب
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isPdf(doc.file_type, doc.file_name) && (
                    <button
                      type="button"
                      onClick={() => openPreview(doc)}
                      disabled={previewLoading === doc.id}
                      className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg disabled:opacity-50"
                      title="معاينة"
                    >
                      {previewLoading === doc.id ? (
                        <span className="inline-block w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadLoading === doc.id}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                    title="تحميل (Save As)"
                  >
                    {downloadLoading === doc.id ? (
                      <span className="inline-block w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => openDocMenu(doc.id, e)}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === doc.id && docMenuPlacement && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} aria-hidden />
                        <div
                          className="fixed z-20 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[180px]"
                          style={{
                            top: docMenuPlacement.top,
                            ...(docMenuPlacement.right != null ? { right: docMenuPlacement.right } : { left: docMenuPlacement.left ?? 0 }),
                          }}
                        >
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-teal-50 text-right font-medium"
                            onClick={() => {
                              setSelectedDocumentIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(doc.id)) next.delete(doc.id);
                                else next.add(doc.id);
                                return next;
                              });
                              setMenuOpen(null);
                            }}
                          >
                            <Check className="w-4 h-4 flex-shrink-0" /> {selectedDocumentIds.has(doc.id) ? "إلغاء التحديد" : "تحديد"}
                          </button>
                          {canCreateFolder && (
                            <button
                              type="button"
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-right"
                              onClick={() => {
                                setMoveDocument(doc);
                                setMenuOpen(null);
                              }}
                            >
                              <FolderInput className="w-4 h-4 flex-shrink-0" /> نقل
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-right"
                              onClick={() => openDeleteDocumentModal(doc)}
                            >
                              <Trash2 className="w-4 h-4 flex-shrink-0" /> حذف
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* تأكيد استعادة تنظيم الملفات */}
      {restoreConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">استعادة تنظيم الملفات</h3>
                  <p className="text-sm text-slate-600 mt-1">هل تريد استعادة تنظيم الملفات؟</p>
                </div>
              </div>
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                إعادة إنشاء المجلدات المحذوفة (فارغة)
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setRestoreConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={restoreDefaultFolders}
                disabled={restoringDefault}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-50 inline-flex items-center gap-2"
              >
                {restoringDefault ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الاستعادة…
                  </>
                ) : (
                  "نعم، استعادة"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد حذف المحدد */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">تأكيد حذف المحدد</h3>
                  <p className="text-sm text-slate-600">هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
                </div>
              </div>
              <p className="mt-4 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-slate-700">
                هل أنت متأكد من حذف {[
                  selectedFolderIds.size > 0 && `${selectedFolderIds.size} مجلد`,
                  selectedDocumentIds.size > 0 && `${selectedDocumentIds.size} ملف`,
                ].filter(Boolean).join(" و")}؟ سيتم حذف محتويات المجلدات أيضاً.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
              >
                نعم، حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {confirmDelete.type === "folder" ? "تأكيد حذف المجلد" : "تأكيد حذف الملف"}
                  </h3>
                  <p className="text-sm text-gray-600">هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-gray-700">
                {confirmDelete.type === "folder"
                  ? <>هل أنت متأكد من حذف المجلد <span className="font-bold text-gray-900">&quot;{stripNumbering(confirmDelete.folder.name)}&quot;</span> وجميع محتوياته؟</>
                  : <>هل أنت متأكد من حذف الملف <span className="font-bold text-gray-900">&quot;{confirmDelete.doc.file_name}&quot;</span>؟</>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={closeConfirmModal} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition">
                إلغاء
              </button>
              <button type="button" onClick={executeConfirmDelete} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition">
                نعم، حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة نقل المجلد */}
      {moveFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">نقل المجلد &quot;{stripNumbering(moveFolder.name)}&quot;</h3>
              <button type="button" onClick={() => setMoveFolder(null)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg">×</button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto space-y-1">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 text-right text-sm rounded-lg hover:bg-teal-50 text-slate-700"
                onClick={() => moveFolderTo(moveFolder, null)}
              >
                <FolderOpen className="w-4 h-4 text-teal-500" /> الرئيسية
              </button>
              {getFolderMoveTargets(moveFolder).map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-right text-sm rounded-lg hover:bg-teal-50 text-slate-700"
                  onClick={() => moveFolderTo(moveFolder, target.id)}
                >
                  <FolderOpen className="w-4 h-4 text-teal-500" /> {stripNumbering(target.name)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* نافذة نقل الملف */}
      {moveDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 truncate">نقل الملف &quot;{moveDocument.file_name}&quot;</h3>
              <button type="button" onClick={() => setMoveDocument(null)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg">×</button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto space-y-1">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 text-right text-sm rounded-lg hover:bg-teal-50 text-slate-700"
                onClick={() => moveDocumentTo(moveDocument, null)}
              >
                <FolderOpen className="w-4 h-4 text-teal-500" /> الرئيسية
              </button>
              {folders.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-right text-sm rounded-lg hover:bg-teal-50 text-slate-700"
                  onClick={() => moveDocumentTo(moveDocument, target.id)}
                >
                  <FolderOpen className="w-4 h-4 text-teal-500" /> {stripNumbering(target.name)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview modal */}
      {previewDoc && previewUrl && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closePreview} aria-hidden />
          <div className="fixed inset-4 sm:inset-8 z-50 bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
              <span className="text-sm font-medium text-slate-700 truncate">{previewDoc.file_name}</span>
              <button
                type="button"
                onClick={closePreview}
                className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
              >
                إغلاق
              </button>
            </div>
            <iframe
              src={previewUrl}
              title={previewDoc.file_name}
              className="flex-1 w-full min-h-0"
            />
          </div>
        </>
      )}
    </div>
  );
}
