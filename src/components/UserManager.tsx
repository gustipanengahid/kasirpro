import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { supabase } from "../lib/supabaseClient";
import {
  UserCheck,
  UserX,
  Shield,
  User as UserIcon,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface UserManagerProps {
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  return (
    <div className="space-y-6 relative">
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

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Role / Akses</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
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
                  <td colSpan={4} className="py-8 text-center text-slate-400">
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManager;
