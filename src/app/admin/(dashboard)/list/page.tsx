"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminLinkItem } from "@/lib/types";
import {
  Plus,
  Search,
  ExternalLink,
  Copy,
  CheckCheck,
  Trash2,
  Edit2,
  AlertTriangle,
  RefreshCw,
  Filter,
  Download,
  Link as LinkIcon,
  Building,
  User,
  ShieldAlert,
  X,
  Check,
} from "lucide-react";

function normalizeUrl(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim().toLowerCase();
  clean = clean.replace(/\/+$/, "");
  return clean;
}

export default function AdminListPage() {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<AdminLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("admin@northfieldcareers.com");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDuplicateOnly, setFilterDuplicateOnly] = useState(false);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminLinkItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    link: "",
    agent: "",
  });

  // Fetch Current Logged-in Admin User
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          if (user.email) {
            setCurrentUserEmail(user.email);
            setFormData((prev) => ({ ...prev, agent: prev.agent || user.email || "" }));
          }
          setCurrentUserId(user.id);
        }
      } catch (err) {
        console.error("Failed to get current user:", err);
      }
    })();
  }, [supabase]);

  // Load items from database
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Table might not exist yet if migration 008 was not run
        console.warn("Could not fetch admin_links table:", error.message);
      } else if (data) {
        setItems(data as AdminLinkItem[]);
      }
    } catch (err) {
      console.error("Error loading links list:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Real-time Postgres changes synchronization
  useEffect(() => {
    const channel = supabase
      .channel("admin-links-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_links" },
        () => {
          loadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadItems]);

  // Duplicate Link Detection Map
  const duplicateStats = useMemo(() => {
    const map = new Map<string, AdminLinkItem[]>();
    items.forEach((item) => {
      const norm = normalizeUrl(item.link);
      if (!norm) return;
      const arr = map.get(norm) || [];
      arr.push(item);
      map.set(norm, arr);
    });

    let duplicateCount = 0;
    map.forEach((list) => {
      if (list.length > 1) {
        duplicateCount += list.length;
      }
    });

    return { map, duplicateCount };
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const norm = normalizeUrl(item.link);
      const isDuplicate = (duplicateStats.map.get(norm)?.length || 0) > 1;

      if (filterDuplicateOnly && !isDuplicate) return false;
      if (selectedAgentFilter !== "all" && item.agent !== selectedAgentFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCompany = item.company.toLowerCase().includes(q);
        const matchesLink = item.link.toLowerCase().includes(q);
        const matchesAgent = item.agent.toLowerCase().includes(q);
        return matchesName || matchesCompany || matchesLink || matchesAgent;
      }

      return true;
    });
  }, [items, duplicateStats, filterDuplicateOnly, selectedAgentFilter, searchQuery]);

  // List of unique agents for filter dropdown
  const uniqueAgents = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.agent) set.add(i.agent);
    });
    return Array.from(set);
  }, [items]);

  // Real-time check in Modal if the current link input is already listed
  const formLinkDuplicateMatch = useMemo(() => {
    const trimmed = normalizeUrl(formData.link);
    if (!trimmed) return null;
    const matches = items.filter((i) => {
      if (editingItem && i.id === editingItem.id) return false;
      return normalizeUrl(i.link) === trimmed;
    });
    return matches.length > 0 ? matches : null;
  }, [formData.link, items, editingItem]);

  // Toast trigger helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Modal for Create or Edit
  const handleOpenModal = (itemToEdit?: AdminLinkItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormData({
        name: itemToEdit.name,
        company: itemToEdit.company,
        link: itemToEdit.link,
        agent: itemToEdit.agent,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        company: "",
        link: "",
        agent: currentUserEmail, // Auto-fill with logged-in admin email
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Submit Save / Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company.trim() || !formData.link.trim()) {
      alert("Please fill in Name, Company, and Link.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        company: formData.company.trim(),
        link: formData.link.trim(),
        agent: formData.agent.trim() || currentUserEmail,
        user_id: currentUserId,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await supabase
          .from("admin_links")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        showToast("Entry updated successfully");
      } else {
        const { error } = await supabase.from("admin_links").insert([payload]);
        if (error) throw error;
        showToast(
          formLinkDuplicateMatch
            ? "Entry saved (Note: duplicate link marked with color)"
            : "New entry added successfully"
        );
      }

      await loadItems();
      handleCloseModal();
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save entry. Make sure migration 008 was run in Supabase.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("admin_links").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirmId(null);
      showToast("Entry deleted");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.message || "Failed to delete entry");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ["#", "Name", "Company", "Link", "Agent", "Is Duplicate", "Created At"];
    const rows = items.map((item, idx) => {
      const norm = normalizeUrl(item.link);
      const isDup = (duplicateStats.map.get(norm)?.length || 0) > 1 ? "YES" : "NO";
      return [
        idx + 1,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.company.replace(/"/g, '""')}"`,
        `"${item.link.replace(/"/g, '""')}"`,
        `"${item.agent.replace(/"/g, '""')}"`,
        isDup,
        `"${new Date(item.created_at).toLocaleString()}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `links_list_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0a2540] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-medium animate-fade-up">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-ink">List &amp; Link Directory</h1>
            {duplicateStats.duplicateCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{duplicateStats.duplicateCount} Duplicate Lines Detected</span>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-muted text-sm">
            Manage links and outreach contacts with automatic logged-in Agent email attribution and color-coded duplicate detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
            title="Export list to CSV file"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadItems}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Reload list"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Add New Entry Button */}
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0069ff] hover:bg-[#0055d4] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Entry</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Total Entries
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Unique Links
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{duplicateStats.map.size}</p>
        </div>

        <div
          className={`border rounded-2xl p-5 shadow-2xs transition-colors ${
            duplicateStats.duplicateCount > 0
              ? "bg-amber-50/50 border-amber-300"
              : "bg-white border-gray-200/90"
          }`}
        >
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Duplicate Links
          </span>
          <div className="flex items-center gap-2 mt-1">
            <p
              className={`text-2xl font-bold ${
                duplicateStats.duplicateCount > 0 ? "text-amber-700" : "text-gray-900"
              }`}
            >
              {duplicateStats.duplicateCount}
            </p>
            {duplicateStats.duplicateCount > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Color Highlighted
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Active Agents
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueAgents.length}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Company, Link, or Agent email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#0069ff] focus:bg-white transition-all font-normal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Duplicates Only Toggle */}
          <button
            type="button"
            onClick={() => setFilterDuplicateOnly(!filterDuplicateOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              filterDuplicateOnly
                ? "bg-amber-100 text-amber-900 border-amber-400 shadow-2xs font-bold"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${filterDuplicateOnly ? "text-amber-700" : "text-gray-400"}`} />
            <span>Show Duplicates Only {duplicateStats.duplicateCount > 0 ? `(${duplicateStats.duplicateCount})` : ""}</span>
          </button>

          {/* Agent Filter Dropdown */}
          {uniqueAgents.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="text-xs font-medium text-gray-700 bg-transparent outline-none cursor-pointer pr-2"
              >
                <option value="all">All Agents</option>
                {uniqueAgents.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-gray-200/90 rounded-2xl shadow-sm overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5">Company</th>
                <th className="py-3.5 px-6 min-w-[280px]">Link</th>
                <th className="py-3.5 px-5">Agent</th>
                <th className="py-3.5 px-4 text-center">Duplicate Status</th>
                <th className="py-3.5 px-5 text-right w-24">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm font-normal text-gray-700">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-mono text-xs">
                    Loading entries list…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                    {items.length === 0
                      ? "No entries in the list yet. Click '+ Add New Entry' above to add your first line."
                      : "No entries match your search query or duplicate filter."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const norm = normalizeUrl(item.link);
                  const duplicatesList = duplicateStats.map.get(norm) || [];
                  const isDuplicate = duplicatesList.length > 1;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${
                        isDuplicate
                          ? "bg-amber-50/70 hover:bg-amber-100/60 border-l-4 border-l-amber-500"
                          : "hover:bg-gray-50/70"
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-4 px-4 text-center font-mono text-xs text-gray-400">
                        {index + 1}
                      </td>

                      {/* Name */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{item.name}</span>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-800">
                          <Building className="w-3 h-3 text-gray-500" />
                          <span>{item.company}</span>
                        </span>
                      </td>

                      {/* Link */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 max-w-md">
                          <LinkIcon className={`w-3.5 h-3.5 shrink-0 ${isDuplicate ? "text-amber-600" : "text-blue-500"}`} />
                          <a
                            href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`font-mono text-xs font-medium truncate hover:underline ${
                              isDuplicate ? "text-amber-900 font-bold" : "text-[#0069ff]"
                            }`}
                            title={item.link}
                          >
                            {item.link}
                          </a>
                          <a
                            href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-700 shrink-0 p-1"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <CopyButton value={item.link} />
                        </div>
                      </td>

                      {/* Agent (Logged-in admin email) */}
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-950">
                          <User className="w-3 h-3 text-blue-600" />
                          <span className="truncate max-w-[180px]" title={item.agent}>
                            {item.agent}
                          </span>
                        </div>
                      </td>

                      {/* Duplicate Status Badge */}
                      <td className="py-4 px-4 text-center">
                        {isDuplicate ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs cursor-help"
                            title={`This link appears ${duplicatesList.length} times in the list across agents: ${duplicatesList
                              .map((d) => d.agent)
                              .join(", ")}`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Duplicate ({duplicatesList.length} lines)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Unique</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {deleteConfirmId === item.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-2xs cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0069ff]">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingItem ? "Edit Entry" : "Add New List Entry"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Agent email is automatically set to your logged-in admin account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Lead Contact"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all bg-white"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Company *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Marketing Group"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all bg-white"
                />
              </div>

              {/* Link with Instant Duplicate Warning */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Link (URL) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://linkedin.com/in/johndoe or domain.com/lead"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono text-gray-900 outline-none transition-all bg-white ${
                    formLinkDuplicateMatch
                      ? "border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-amber-50/30"
                      : "border-gray-300 focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff]"
                  }`}
                />

                {/* Instant Duplicate Notification Box */}
                {formLinkDuplicateMatch && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-fade-down">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Notice: This link is already listed in {formLinkDuplicateMatch.length} existing line(s)!</span>
                    </div>
                    <p className="text-amber-800/90 text-[11px] pl-5">
                      Already added by:{" "}
                      <span className="font-semibold">
                        {formLinkDuplicateMatch.map((m) => `${m.name} (${m.agent})`).join(", ")}
                      </span>
                      . You can still proceed if you want to save it as a duplicate (it will be color-coded in the list).
                    </p>
                  </div>
                )}
              </div>

              {/* Agent (Auto-filled with Logged-in Admin Email) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Agent (Admin Email) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    placeholder={currentUserEmail}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 outline-none focus:border-[#0069ff] focus:bg-white transition-all font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Logged In
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Automatically set to your logged-in administrator account ({currentUserEmail}).
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#0069ff] hover:bg-[#0055d4] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? (
                    <span>Saving…</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingItem ? "Save Changes" : "Add to List"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Copy button with visual feedback
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy link"}
      className={`p-1 rounded-md transition-all ${
        copied ? "text-emerald-600 bg-emerald-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
