import React from "react";
import {
  Users,
  X,
  Clock,
  RotateCcw,
  Search,
  User,
  ShieldCheck,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  ScanLine,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { DEFAULT_ADMIN_HASH } from "../../utils/security";
import { isValidDiscordWebhookUrl } from "../../services/discordWebhook";

export default function AdminSecurityTab({
  activeAdminName,
  currentAdmin,
  allowMasterOnboarding,
  adminAccounts,
  adminAccountAction,
  setAdminAccountAction,
  isProcessingAccountAction,
  handleExecuteAdminAccountAction,
  showSelfCredForm,
  setShowSelfCredForm,
  selfCredForm,
  setSelfCredForm,
  isSavingSelfCred,
  handleUpdateSelfCredentials,
  activityLogs,
  isLoadingActivityLogs,
  refreshActivityLogs,
  activityLogCategory,
  setActivityLogCategory,
  activityLogSearch,
  setActivityLogSearch,
  activityLogVisibleCount,
  setActivityLogVisibleCount,
  formData,
  showPasswordForm,
  setShowPasswordForm,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isApplyingPassword,
  handleApplyNewPassword,
  handleResetPinToDefault,
  handleResetPasswordToDefault,
  geminiKeyInput,
  setGeminiKeyInput,
  isTestingGemini,
  handleTestGeminiKey,
  handleSaveGeminiKey,
  discordWebhookConfig,
  setDiscordWebhookConfig,
  isTestingWebhook,
  isSavingWebhook,
  handleTestDiscordWebhook,
  handleSaveDiscordWebhook,
  handleLogout,
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Pengurus Accounts Management Card */}
      <div className="card-brutal p-3.5 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-500/15 border-2 border-amber-500 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-[2px_2px_0px_#d97706] shrink-0">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                Akun Pengurus &amp; Audit Akses
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Setiap pengurus login pakai akun IC pribadi agar ACC, kas, dan bansos tercatat otomatis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setAdminAccountAction({
                type: "toggle_onboarding",
                masterInput: "",
                newPassword: "",
                newPin: "",
              })
            }
            className={`btn w-full sm:w-auto justify-center text-xs py-2 sm:py-1.5 px-3 font-black border border-black/20 dark:border-white/15 shadow-xs cursor-pointer ${
              allowMasterOnboarding
                ? "bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300"
                : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
            }`}
          >
            {allowMasterOnboarding ? "Aktivasi Pengurus Baru: DIBUKA" : "Aktivasi Pengurus Baru: DITUTUP"}
          </button>
        </div>

        {/* Active Logged-in Pengurus Info + Self Update */}
        <div className="p-3.5 rounded bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FACC15] border border-black/20 flex items-center justify-center font-heading font-black text-sm text-slate-950 shrink-0">
                {activeAdminName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-heading font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{activeAdminName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
                    Sedang Login
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Jabatan: <strong>{currentAdmin?.role || "Pengurus LSM"}</strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSelfCredForm((v) => !v);
                setSelfCredForm({ currentSecret: "", newPassword: "", newPin: "" });
              }}
              className="btn text-xs py-1.5 px-3 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border border-black/20 dark:border-white/15 font-bold shadow-xs cursor-pointer"
            >
              {showSelfCredForm ? "Tutup Form" : "Ubah Password / PIN Saya"}
            </button>
          </div>

          {showSelfCredForm && (
            <form
              onSubmit={handleUpdateSelfCredentials}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-amber-300/60 dark:border-amber-800/50"
            >
              <div>
                <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  Password / PIN Saat Ini *
                </label>
                <input
                  type="password"
                  value={selfCredForm.currentSecret}
                  onChange={(e) =>
                    setSelfCredForm((prev) => ({ ...prev, currentSecret: e.target.value }))
                  }
                  placeholder="Password atau PIN lama..."
                  required
                  className="input-field font-mono text-xs bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10"
                />
              </div>
              <div>
                <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  Password Baru (Opsional)
                </label>
                <input
                  type="password"
                  value={selfCredForm.newPassword}
                  onChange={(e) =>
                    setSelfCredForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  placeholder="Min. 4 karakter..."
                  className="input-field font-mono text-xs bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10"
                />
              </div>
              <div>
                <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  PIN Baru 4-6 Digit (Opsional)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={selfCredForm.newPin}
                  onChange={(e) =>
                    setSelfCredForm((prev) => ({
                      ...prev,
                      newPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  placeholder="Contoh: 123456"
                  className="input-field font-mono text-xs bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingSelfCred}
                  className="btn text-xs py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black border border-black/20 shadow-xs disabled:opacity-50"
                >
                  {isSavingSelfCred ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSelfCredForm(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3 border border-black/15 dark:border-white/10"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Inline Master Confirmation Panel for Sensitive Account Actions */}
        {adminAccountAction && (
          <form
            onSubmit={handleExecuteAdminAccountAction}
            className="p-4 rounded bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/70 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-heading font-black text-xs uppercase text-rose-900 dark:text-rose-200">
                  {adminAccountAction.type === "toggle_onboarding"
                    ? allowMasterOnboarding
                      ? "Konfirmasi Tutup Aktivasi Pengurus Baru"
                      : "Konfirmasi Buka Aktivasi Pengurus Baru"
                    : adminAccountAction.type === "delete"
                    ? `Konfirmasi Cabut Akses: ${adminAccountAction.account?.name}`
                    : `Reset Password & PIN: ${adminAccountAction.account?.name}`}
                </div>
                <p className="text-[11px] text-rose-800/90 dark:text-rose-300 mt-0.5">
                  {adminAccountAction.type === "toggle_onboarding"
                    ? "Masukkan Kode Akses Utama (Master Password/PIN) untuk mengubah status aktivasi pengurus baru."
                    : adminAccountAction.type === "delete"
                    ? "Akun ini akan dihapus dan otomatis keluar dari semua browser yang sedang login."
                    : "Tentukan Password & PIN sementara baru untuk pengurus ini, lalu konfirmasi pakai Kode Akses Utama."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminAccountAction(null)}
                className="p-1 rounded hover:bg-rose-200/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {adminAccountAction.type === "reset" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                    Password Sementara Baru *
                  </label>
                  <input
                    type="text"
                    value={adminAccountAction.newPassword}
                    onChange={(e) =>
                      setAdminAccountAction((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    placeholder="Minimal 4 karakter..."
                    required
                    className="input-field font-mono text-xs bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                    PIN Sementara Baru (4-6 Digit) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={adminAccountAction.newPin}
                    onChange={(e) =>
                      setAdminAccountAction((prev) => ({
                        ...prev,
                        newPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    placeholder="Contoh: 123456"
                    required
                    className="input-field font-mono text-xs bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={adminAccountAction.masterInput}
                onChange={(e) =>
                  setAdminAccountAction((prev) => ({ ...prev, masterInput: e.target.value }))
                }
                placeholder="Masukkan Kode Akses Utama (Master Password / PIN)..."
                autoFocus
                required
                className="input-field font-mono text-xs flex-1 bg-white dark:bg-[#1A1D26] border border-black/20 dark:border-white/15"
              />
              <button
                type="submit"
                disabled={isProcessingAccountAction}
                className="btn text-xs py-2 px-4 bg-[#DC2626] hover:bg-red-700 text-white font-black border border-black/20 shadow-xs disabled:opacity-50"
              >
                {isProcessingAccountAction ? "Memproses..." : "Konfirmasi & Terapkan"}
              </button>
              <button
                type="button"
                onClick={() => setAdminAccountAction(null)}
                className="btn btn-secondary text-xs py-2 px-3 border border-black/15 dark:border-white/10"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Registered Pengurus Accounts List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-heading font-black uppercase text-slate-600 dark:text-slate-400">
            <span>Daftar Pengurus Terdaftar ({adminAccounts.length})</span>
          </div>
          {adminAccounts.length === 0 ? (
            <div className="p-3 rounded bg-slate-50 dark:bg-[#1E222D] border border-black/10 dark:border-white/10 text-xs text-slate-500">
              Belum ada akun pengurus tersimpan.
            </div>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10 border border-black/15 dark:border-white/10 rounded overflow-hidden">
              {adminAccounts.map((acc) => {
                const isMe = currentAdmin?.id === acc.id;
                return (
                  <div
                    key={acc.id}
                    className="p-3 bg-white dark:bg-[#1A1D26] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-heading font-black text-xs text-slate-900 dark:text-slate-100">
                          {acc.name}
                        </span>
                        {acc.role && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10">
                            {acc.role}
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-400/60">
                            ANDA
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Daftar: {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString("id-ID") : "-"} • Terakhir login:{" "}
                        {acc.lastLoginAt
                          ? new Date(acc.lastLoginAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setAdminAccountAction({
                            type: "reset",
                            account: acc,
                            masterInput: "",
                            newPassword: "",
                            newPin: "",
                          })
                        }
                        className="px-2.5 py-2 sm:py-1 rounded text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-400/70 cursor-pointer text-center"
                      >
                        Reset Akses
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAdminAccountAction({
                            type: "delete",
                            account: acc,
                            masterInput: "",
                            newPassword: "",
                            newPin: "",
                          })
                        }
                        className="px-2.5 py-2 sm:py-1 rounded text-[11px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-400/70 cursor-pointer text-center"
                      >
                        Cabut Akses
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Log Aktivitas Pengurus (Audit Trail Internal) */}
      <div className="card-brutal p-3.5 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-sky-500/15 border-2 border-sky-600 flex items-center justify-center text-sky-700 dark:text-sky-300 shadow-[2px_2px_0px_#0284c7] shrink-0">
              <Clock size={19} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                  Log Aktivitas Pengurus
                </h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10">
                  {activityLogs.length} Catatan
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Rekam jejak otomatis siapa pengurus yang ACC, catat/hapus kas, bansos, dan ubah pengaturan
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoadingActivityLogs}
            onClick={refreshActivityLogs}
            className="btn w-full sm:w-auto justify-center text-xs py-2 sm:py-1.5 px-3 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-black/20 dark:border-white/15 font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={13} className={isLoadingActivityLogs ? "animate-spin" : ""} />
            <span>{isLoadingActivityLogs ? "Memuat..." : "Muat Ulang Log"}</span>
          </button>
        </div>

        {/* Filter Category Pills + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 sm:flex-wrap">
            {[
              { id: "ALL", label: "Semua" },
              { id: "ANGGOTA", label: "Anggota" },
              { id: "KEUANGAN", label: "Keuangan" },
              { id: "BANSOS", label: "Bansos" },
              { id: "KEAMANAN", label: "Keamanan" },
              { id: "KONTEN", label: "Konten Web" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActivityLogCategory(cat.id);
                  setActivityLogVisibleCount(25);
                }}
                className={`px-2.5 py-1.5 rounded text-[11px] font-mono font-bold border transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                  activityLogCategory === cat.id
                    ? "bg-slate-900 dark:bg-[#FACC15] text-white dark:text-slate-950 border-black dark:border-amber-400"
                    : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-black/15 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56 shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={activityLogSearch}
              onChange={(e) => setActivityLogSearch(e.target.value)}
              placeholder="Cari pengurus atau aksi..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#20232E] border border-black/15 dark:border-white/10 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FACC15]"
            />
            {activityLogSearch && (
              <button
                type="button"
                onClick={() => setActivityLogSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Timeline List */}
        {(() => {
          const q = activityLogSearch.trim().toLowerCase();
          const filteredLogs = activityLogs.filter((item) => {
            if (activityLogCategory !== "ALL" && item.category !== activityLogCategory) return false;
            if (!q) return true;
            const hay = `${item.adminName || ""} ${item.adminRole || ""} ${item.action || ""} ${item.detail || ""} ${item.category || ""}`.toLowerCase();
            return hay.includes(q);
          });
          const visibleLogs = filteredLogs.slice(0, activityLogVisibleCount);

          const catBadgeStyles = {
            ANGGOTA: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-400/60",
            KEUANGAN: "bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-400/60",
            BANSOS: "bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-400/60",
            KEAMANAN: "bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-400/60",
            KONTEN: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-400/50",
          };

          if (isLoadingActivityLogs && activityLogs.length === 0) {
            return (
              <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-50 dark:bg-[#1A1D26] rounded border border-black/10 dark:border-white/10">
                Memuat catatan aktivitas pengurus...
              </div>
            );
          }

          if (filteredLogs.length === 0) {
            return (
              <div className="p-6 text-center bg-slate-50 dark:bg-[#1A1D26] rounded border border-black/10 dark:border-white/10">
                <div className="text-xs font-heading font-black text-slate-700 dark:text-slate-300">
                  {activityLogs.length === 0
                    ? "Belum ada log aktivitas tersimpan"
                    : "Tidak ada log yang cocok dengan filter"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {activityLogs.length === 0
                    ? "Setiap aksi ACC/Tolak anggota, catat atau hapus kas, bansos, login, dan pengaturan keamanan akan otomatis tercatat di sini."
                    : "Coba ganti kategori atau hapus kata kunci pencarian."}
                </p>
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-2">
              <div className="max-h-[380px] overflow-y-auto divide-y divide-black/10 dark:divide-white/10 border border-black/15 dark:border-white/10 rounded overflow-hidden bg-white dark:bg-[#1A1D26]">
                {visibleLogs.map((log) => {
                  const badgeClass = catBadgeStyles[log.category] || catBadgeStyles.KONTEN;
                  const timeLabel = log.timestamp
                    ? new Date(log.timestamp).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";
                  return (
                    <div key={log.id} className="p-3 flex flex-col gap-1 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${badgeClass}`}>
                            {log.category || "SISTEM"}
                          </span>
                          <span className="font-heading font-black text-xs text-slate-900 dark:text-slate-100">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {timeLabel} WIB
                        </span>
                      </div>
                      {log.detail && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug break-words">
                          {log.detail}
                        </p>
                      )}
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <User size={11} className="text-[#DC2626] dark:text-[#FACC15] shrink-0" />
                        <span>
                          Oleh: <strong className="text-slate-800 dark:text-slate-200">{log.adminName || "Admin LSM PPS"}</strong>
                          {log.adminRole && log.adminRole !== "Pengurus LSM" ? ` (${log.adminRole})` : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredLogs.length > activityLogVisibleCount && (
                <button
                  type="button"
                  onClick={() => setActivityLogVisibleCount((n) => n + 25)}
                  className="btn w-full py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/15 dark:border-white/10 cursor-pointer"
                >
                  Tampilkan Lebih Banyak ({filteredLogs.length - activityLogVisibleCount} lagi)
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Security Architecture Card */}
      <div className="card-brutal p-3.5 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b-2 border-black/10 dark:border-white/10 pb-3">
          <div className="w-10 h-10 rounded bg-emerald-500/10 border-2 border-emerald-600 flex items-center justify-center text-emerald-600 shadow-[2px_2px_0px_#059669] shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
              Sistem Keamanan &amp; Enkripsi Portal
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Standar pengamanan akses dashboard LSM Sandy Shores
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-[#1E222D] border border-black/15 dark:border-white/10 rounded">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Enkripsi Kata Sandi
            </div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> SHA-256 Cryptographic Hash
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Password &amp; PIN pribadi dienkripsi satu arah sebelum disimpan ke database.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#1E222D] border border-black/15 dark:border-white/10 rounded">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Proteksi Anti Brute-Force
            </div>
            <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldAlert size={14} /> Maks 5 Percobaan / Kunci 60 Detik
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Mencegah bot dan serangan tebak password otomatis.
            </div>
          </div>
        </div>

        {/* Hash fingerprint info */}
        <div className="p-3 bg-slate-100 dark:bg-[#181A22] border border-black/20 dark:border-white/15 rounded flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            Fingerprint Hash Kode Akses Utama (SHA-256):
          </span>
          <code className="text-[11px] font-mono break-all text-slate-800 dark:text-slate-200 bg-white dark:bg-[#111319] p-2 border border-black/10 dark:border-white/10 rounded select-all">
            {formData.adminPassHash || DEFAULT_ADMIN_HASH}
          </code>
        </div>
      </div>

      {/* Change Master Password Card */}
      <div className="card-brutal p-3.5 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <KeyRound size={18} className="text-[#DC2626] shrink-0" />
            <div className="min-w-0">
              <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                Kode Akses Utama (Master Aktivasi)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Dipakai untuk aktivasi akun pengurus baru &amp; konfirmasi hapus/reset akun
              </p>
            </div>
          </div>
          {!showPasswordForm && (
            <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 sm:flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="btn w-full sm:w-auto justify-center text-xs py-2 sm:py-1.5 px-3 bg-[#FACC15] text-[#111827] border border-black/20 dark:border-white/15 font-black shadow-xs active:translate-x-0.5 active:translate-y-0.5"
              >
                Ubah PIN / Password
              </button>
              <button
                type="button"
                onClick={handleResetPinToDefault}
                className="btn w-full sm:w-auto justify-center text-xs py-2 sm:py-1.5 px-3 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-black/20 dark:border-white/15 font-bold shadow-xs active:translate-x-0.5 active:translate-y-0.5"
                title="Atur kode akses admin ke PIN default: 114123"
              >
                Reset ke PIN 114123
              </button>
              <button
                type="button"
                onClick={handleResetPasswordToDefault}
                className="btn w-full sm:w-auto justify-center text-xs py-2 sm:py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/20 dark:border-white/15 font-bold shadow-xs active:translate-x-0.5 active:translate-y-0.5"
                title="Kembalikan password ke default: @adminpps22h6"
              >
                Reset ke Password Default
              </button>
            </div>
          )}
        </div>

        {showPasswordForm ? (
          <div className="flex flex-col gap-3.5 bg-slate-50 dark:bg-[#1C1F2A] p-4 border border-black/20 dark:border-white/15 rounded">
            <div>
              <label className="card-label text-slate-700 dark:text-slate-300 mb-1 block">
                PIN / Password Baru (Minimal 6 Karakter atau 6 Digit)
              </label>
              <input
                type="password"
                placeholder="Ketik 6 digit PIN atau password baru..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
              />
            </div>

            <div>
              <label className="card-label text-slate-700 dark:text-slate-300 mb-1 block">
                Konfirmasi Ulang Password Baru
              </label>
              <input
                type="password"
                placeholder="Ulangi password baru..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isApplyingPassword}
                onClick={handleApplyNewPassword}
                className="btn text-xs py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black border border-black/20 dark:border-white/15 shadow-xs active:translate-x-0.5 active:translate-y-0.5"
              >
                {isApplyingPassword ? "Menyimpan ke Database..." : "Simpan & Terapkan Password Baru"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="btn btn-secondary text-xs py-2 px-3 border border-black/15 dark:border-white/10"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 rounded text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-1">
            <span className="font-heading font-black text-amber-900 dark:text-amber-200">
              Informasi Akses Rekan Admin:
            </span>
            <p className="text-[11px] leading-relaxed">
              PIN Default: <strong className="font-mono text-[#DC2626] dark:text-[#FACC15]">114123</strong> dan Password Default: <strong className="font-mono text-[#DC2626] dark:text-[#FACC15]">@adminpps22h6</strong> selalu aktif sebagai akses darurat jika ada rekan pengurus yang lupa kode akses baru.
            </p>
          </div>
        )}
      </div>

      {/* Google Gemini Vision AI Card */}
      <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#FACC15] flex items-center justify-center text-[#DC2626] shrink-0 border border-black/25 shadow-xs">
              <ScanLine size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100">
                  Integrasi AI Vision (Google Gemini)
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  geminiKeyInput?.trim()
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500/40"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                }`}>
                  {geminiKeyInput?.trim() ? "AI Vision Aktif" : "Mode Standar (Tesseract)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Memindai foto KTP IC secara instan dengan kecerdasan multi-modal (99.9% akurat).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300">
            Gemini API Key (Google AI Studio)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              placeholder="AQ.Ab8RN6... atau AIzaSy..."
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              className="input-field font-mono text-xs flex-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
            />
            <button
              type="button"
              disabled={isTestingGemini}
              onClick={handleTestGeminiKey}
              className="btn text-xs py-2 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold border border-black/20 dark:border-white/15 shadow-xs active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              {isTestingGemini ? "Menguji..." : "Uji Koneksi AI"}
            </button>
            <button
              type="button"
              onClick={handleSaveGeminiKey}
              className="btn text-xs py-2 px-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold border border-black/20 dark:border-white/15 shadow-xs active:translate-x-0.5 active:translate-y-0.5"
            >
              Simpan Key
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Kunci API tersinkron ke Cloud dan otomatis dipakai di seluruh fitur OCR (pendaftaran anggota, klaim bansos, lapak UMKM, request meeting, event/UFC, dan Jasra). Jika kosong atau offline, sistem otomatis beralih ke OCR spasial lokal.
          </p>
        </div>
      </div>

      {/* Discord Webhook Notification Config Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151824] border border-black/10 dark:border-white/10 shadow-sm flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-slate-900 dark:text-slate-100">
                  Notifikasi Otomatis Discord (Webhook)
                </h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isValidDiscordWebhookUrl(discordWebhookConfig.webhookUrl) && discordWebhookConfig.enabled
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500/40"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {isValidDiscordWebhookUrl(discordWebhookConfig.webhookUrl) && discordWebhookConfig.enabled
                    ? "Webhook Aktif"
                    : "Belum Aktif"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Kirim laporan embed otomatis ke channel Discord pengurus untuk pendaftaran anggota, keputusan ACC/Tolak, tiket layanan, klaim bansos, dan catatan keuangan kas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300">
              URL Discord Webhook Utama (Channel Pengurus)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordWebhookConfig.webhookUrl}
                onChange={(e) =>
                  setDiscordWebhookConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))
                }
                className="input-field font-mono text-xs flex-1 bg-slate-50 dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-xl"
              />
              <button
                type="button"
                disabled={isTestingWebhook}
                onClick={() => handleTestDiscordWebhook("main")}
                className="py-2 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-heading font-bold border border-indigo-600 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isTestingWebhook ? "Mengirim..." : "Tes Utama"}
              </button>
              <button
                type="button"
                disabled={isSavingWebhook}
                onClick={handleSaveDiscordWebhook}
                className="py-2 px-3.5 rounded-xl bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border border-amber-400/80 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSavingWebhook ? "Menyimpan..." : "Simpan Webhook"}
              </button>
            </div>
          </div>

          {/* Optional Dedicated Finance Webhook URL */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-black/10 dark:border-white/10">
            <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
              <span>URL Webhook Khusus Keuangan / Kas</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50">
                OPSIONAL
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="Kosongkan jika ingin ikut URL Webhook Utama di atas..."
                value={discordWebhookConfig.kasWebhookUrl || ""}
                onChange={(e) =>
                  setDiscordWebhookConfig((prev) => ({ ...prev, kasWebhookUrl: e.target.value }))
                }
                className="input-field font-mono text-xs flex-1 bg-slate-50 dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-xl"
              />
              <button
                type="button"
                disabled={isTestingWebhook}
                onClick={() => handleTestDiscordWebhook("kas")}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold border border-emerald-700 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isTestingWebhook ? "Mengirim..." : "Tes Kas"}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Jika kosong, notifikasi Pemasukan &amp; Pengeluaran Kas otomatis dikirim ke URL Webhook Utama. Catatan Discord: menu <strong>Integrations &rarr; Webhooks</strong> hanya muncul jika role Anda memiliki izin <strong>Manage Webhooks</strong> di channel tersebut.
            </p>
          </div>

          {/* Event Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {[
              { key: "enabled", label: "Aktifkan Notifikasi Discord" },
              { key: "notifyMemberReg", label: "Pendaftaran Anggota Baru (/daftar)" },
              { key: "notifyMemberDecision", label: "Keputusan Verifikasi Anggota (ACC / Tolak)" },
              { key: "notifyServiceUmkm", label: "Pengajuan Lapak UMKM" },
              { key: "notifyServiceMeeting", label: "Permintaan Jadwal Meeting" },
              { key: "notifyBansos", label: "Klaim Bantuan Sosial (Bansos)" },
              { key: "notifyKas", label: "Catat Keuangan / Kas (Masuk & Keluar)" },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1D27] border border-black/10 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={Boolean(discordWebhookConfig[item.key])}
                  onChange={(e) =>
                    setDiscordWebhookConfig((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#DC2626] rounded cursor-pointer"
                />
                <span className="font-semibold text-[11px]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Browser Session Card */}
      <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100">
            Sesi Login di Browser Ini
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tersimpan aman (SHA-256 Session Token)</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="btn text-xs py-2 px-3.5 bg-red-600 hover:bg-red-700 text-white font-heading font-black border border-black/20 dark:border-white/15 dark:border-red-400 shadow-xs active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
        >
          <LogOut size={14} className="text-white" />
          <span>Hapus Sesi &amp; Logout</span>
        </button>
      </div>
    </div>
  );
}
