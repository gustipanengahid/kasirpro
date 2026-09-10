import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { supabase } from "../lib/supabaseClient";
import {
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Key,
  User as UserIcon,
  Check,
  X,
  Settings,
  Loader2,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface UserManagerProps {
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // State untuk modal Reset Password Langsung
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // State untuk Toast Notifikasi Modern
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    password: string;
    role: UserRole;
    active: boolean;
  }>({
    name: "",
    username: "",
    password: "",
    role: "cashier",
    active: true,
  });

  // 1. Ambil data users dari Supabase
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        setUsers(data as User[]);
      }
    } catch (err: any) {
      console.error("Gagal mengambil data user:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Load data & Aktifkan Supabase Realtime Listener
  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel("realtime_users_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          fetchUsers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      username: "",
      password: "",
      role: "cashier",
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: "",
      role: user.role,
      active: user.active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleOpenResetModal = (user: User) => {
    setResetTargetUser(user);
    setNewPassword("");
    setIsResetModalOpen(true);
  };

  const sanitizeEmail = (input: string, role: UserRole): string => {
    const clean = input.trim().toLowerCase();
    if (clean.includes("@")) return clean;
    const domainMap: Record<UserRole, string> = {
      owner: "owner.co",
      admin: "admin.co",
      cashier: "kasir.co",
    };
    return `${clean}@${domainMap[role] || "kasir.co"}`;
  };

  // 3. Simpan / Tambah / Update Data Pengguna (Dilindungi Anti-Spam / Double Click)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Mencegah klik beruntun penyebab error 429
    setIsSubmitting(true);

    try {
      if (editingUser) {
        const updatePayload: Partial<User> = {
          name: formData.name,
          username: formData.username,
          role: formData.role,
          active: formData.active,
        };

        const { error } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", editingUser.id);

        if (error) throw error;
        showNotification("success", "Data pengguna berhasil diperbarui!");
      } else {
        const sanitizedEmail = sanitizeEmail(formData.username, formData.role);

        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("username", formData.username)
          .maybeSingle();

        if (existingUser) {
          throw new Error(`Username "${formData.username}" sudah terdaftar.`);
        }

        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: sanitizedEmail,
            password: formData.password,
            options: {
              data: {
                name: formData.name,
                username: formData.username,
                role: formData.role,
              },
            },
          },
        );

        if (authError) throw authError;

        if (!authData.user || authData.user.identities?.length === 0) {
          throw new Error(`Email "${sanitizedEmail}" sudah terdaftar di Auth.`);
        }

        const { error: profileError } = await supabase.from("users").insert([
          {
            auth_id: authData.user.id,
            name: formData.name,
            username: formData.username,
            role: formData.role,
            active: formData.active,
          },
        ]);

        if (profileError) throw profileError;
        showNotification("success", "Pengguna baru berhasil ditambahkan!");
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      showNotification("error", err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Eksekusi Reset Password Langsung via RPC
  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword || isResetting) return;
    setIsResetting(true);

    try {
      const { error } = await supabase.rpc("admin_reset_user_password", {
        new_password: newPassword,
        target_user_id: resetTargetUser.auth_id || resetTargetUser.id,
      });

      if (error) throw error;

      showNotification(
        "success",
        `Password akun "${resetTargetUser.name}" berhasil diubah!`,
      );
      setIsResetModalOpen(false);
      setNewPassword("");
    } catch (err: any) {
      showNotification("error", "Gagal mereset password: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // 5. Ubah Status Aktif/Non-Aktif
  const toggleUserStatus = async (user: User) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ active: !user.active })
        .eq("id", user.id);

      if (error) throw error;
      showNotification("success", `Status akun "${user.name}" diperbarui.`);
      await fetchUsers();
    } catch (err: any) {
      showNotification("error", "Gagal mengubah status: " + err.message);
    }
  };

  // 6. Hapus Pengguna
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?"))
      return;

    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      showNotification("success", "Pengguna berhasil dihapus.");
      await fetchUsers();
    } catch (err: any) {
      showNotification("error", "Gagal menghapus pengguna: " + err.message);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* TOAST NOTIFIKASI MODERN */}
      {notification.show && (
        <div className="fixed top-5 right-5 z-50 animate-bounce duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold text-white ${
              notification.type === "success"
                ? "bg-slate-900 border-slate-700 text-slate-100 shadow-slate-900/20"
                : "bg-red-600 border-red-500 text-white shadow-red-600/20"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-orange-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-white shrink-0" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() =>
                setNotification((prev) => ({ ...prev, show: false }))
              }
              className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/85">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <UserIcon size={18} className="text-orange-500" />
            Manajemen Pengguna
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola akun, akses role pengguna dan status aktivasi secara
            realtime.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* TABEL PENGGUNA */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Role / Akses</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2
                        size={16}
                        className="animate-spin text-orange-500"
                      />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/65 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-600 flex items-center justify-center uppercase text-xs shrink-0">
                            {user.name.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-extrabold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {user.username}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            user.role === "owner"
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : user.role === "admin"
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <Shield size={10} />
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                            user.active
                              ? "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          } ${isSelf ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {user.active ? (
                            <>
                              <UserCheck
                                size={12}
                                className="text-orange-500"
                              />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <UserX size={12} className="text-slate-400" />
                              <span>Non-Aktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenResetModal(user)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Ganti Password Langsung"
                          >
                            <KeyRound size={15} />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 size={15} />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus User"
                            >
                              <Trash2 size={15} />
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

      {/* MODAL RESET PASSWORD LANGSUNG */}
      {isResetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <KeyRound size={16} className="text-amber-500" />
                Ganti Password Pengguna
              </h3>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Masukkan password baru untuk pengguna{" "}
              <strong className="text-slate-700">
                {resetTargetUser.name}
              </strong>{" "}
            </p>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-orange-500 focus:bg-white pl-8"
                  />
                  <Key
                    size={14}
                    className="absolute left-2.5 top-2.5 text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70"
                >
                  {isResetting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{isResetting ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <UserIcon size={16} className="text-orange-500" />
                {editingUser ? "Edit Data Pengguna" : "Tambah Pengguna Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Gusti Panengah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username / Email
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="gustipanengah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-orange-500 focus:bg-white"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Buat password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-orange-500 focus:bg-white pl-8"
                    />
                    <Key
                      size={14}
                      className="absolute left-2.5 top-2.5 text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-orange-500 focus:bg-white cursor-pointer"
                >
                  <option value="cashier">Kasir</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-700">
                  Status Akun Active
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, active: !formData.active })
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    formData.active ? "bg-orange-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.active ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
