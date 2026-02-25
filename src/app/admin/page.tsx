"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  dsp: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserForm {
  email: string;
  password: string;
  name: string;
  role: string;
  dsp: string;
}

const EMPTY_FORM: UserForm = {
  email: "",
  password: "",
  name: "",
  role: "viewer",
  dsp: "",
};

export default function AdminPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(`Failed to load users: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser?.role !== "admin") {
      router.push("/");
      return;
    }
    if (!authLoading && currentUser?.role === "admin") {
      fetchUsers();
    }
  }, [authLoading, currentUser, router, fetchUsers]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const openCreateForm = () => {
    clearMessages();
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (u: User) => {
    clearMessages();
    setEditingUser(u);
    setForm({
      email: u.email,
      password: "",
      name: u.name,
      role: u.role,
      dsp: u.dsp || "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setSaving(true);

    try {
      if (editingUser) {
        const body: Record<string, unknown> = {
          name: form.name,
          role: form.role,
          dsp: form.dsp || null,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess(`User ${form.name} updated successfully`);
      } else {
        if (!form.password) {
          setError("Password is required for new users");
          setSaving(false);
          return;
        }

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            name: form.name,
            role: form.role,
            dsp: form.dsp || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess(`User ${form.name} created successfully`);
      }

      cancelForm();
      fetchUsers();
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: User) => {
    clearMessages();
    try {
      if (u.active) {
        const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess(`${u.name} deactivated`);
      } else {
        const res = await fetch(`/api/admin/users/${u.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess(`${u.name} reactivated`);
      }
      fetchUsers();
    } catch (err) {
      setError(`${err}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a3a5f]">
            User Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create, edit, and manage dashboard access
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors self-start shadow"
        >
          + New User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
          {success}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-[#1a3a5f] mb-4">
            {editingUser ? `Edit: ${editingUser.name}` : "Create New User"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#1a3a5f] focus:border-transparent outline-none"
                  placeholder="user@company.com"
                  required
                  disabled={!!editingUser}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password{editingUser ? " (leave empty to keep)" : ""}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#1a3a5f] focus:border-transparent outline-none"
                  placeholder={editingUser ? "Unchanged" : "Required"}
                  required={!editingUser}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#1a3a5f] focus:border-transparent outline-none"
                  placeholder="Full name"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-[#1a3a5f] focus:border-transparent outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* DSP Filter */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DSP Filter{" "}
                  <span className="text-gray-400 font-normal">
                    (leave empty to see all DSPs)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.dsp}
                  onChange={(e) => setForm({ ...form, dsp: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#1a3a5f] focus:border-transparent outline-none"
                  placeholder="e.g., Amazon DSP / Leave empty for all data"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#1a3a5f] hover:bg-[#0f2a4a] disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving
                  ? "Saving..."
                  : editingUser
                    ? "Update User"
                    : "Create User"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold hidden sm:table-cell">
                Email
              </th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">DSP</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  !u.active ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-3 text-gray-900 font-medium">
                  <div>{u.name}</div>
                  <div className="text-xs text-gray-400 sm:hidden">
                    {u.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                  {u.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {u.dsp || (
                    <span className="text-gray-300">All DSPs</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        u.active ? "bg-green-500" : "bg-red-400"
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditForm(u)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs font-medium transition-colors px-2 py-1 rounded ${
                        u.active
                          ? "text-red-600 hover:text-red-800 hover:bg-red-50"
                          : "text-green-600 hover:text-green-800 hover:bg-green-50"
                      }`}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No users found. Create the first user above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {users.length} user{users.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}
