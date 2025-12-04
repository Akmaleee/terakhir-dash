// src/app/users/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

// HAPUS IMPORT SELECT DARI SHADCN
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    role: "user"
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Gagal menyimpan");
      
      setModalOpen(false);
      fetchUsers();
      resetForm();
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Yakin hapus user ini?")) return;
    try {
        await fetch(`/api/users/${id}`, { method: "DELETE" });
        fetchUsers();
    } catch (err) {
        alert("Gagal menghapus");
    }
  }

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ username: "", name: "", email: "", password: "", role: "user" });
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  }

  const openEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
        username: user.username,
        name: user.name,
        email: user.email,
        password: "", // Kosongkan password saat edit
        role: user.role
    });
    setModalOpen(true);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2"/> Add User</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
                 </TableRow>
              ) : users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Pencil className="w-4 h-4 text-blue-600"/>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="w-4 h-4 text-red-600"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="username">Username</Label>
                    <Input 
                        id="username"
                        value={formData.username} 
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        disabled={!!editingUser}
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="name">Name</Label>
                    <Input 
                        id="name"
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                        id="email"
                        type="email"
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="password">Password {editingUser && <span className="text-xs text-muted-foreground">(Biarkan kosong jika tidak diubah)</span>}</Label>
                    <Input 
                        id="password"
                        type="password"
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required={!editingUser}
                    />
                </div>
                
                {/* --- PENGGANTIAN SELECT SHADCN KE NATIVE HTML SELECT --- */}
                <div>
                    <Label htmlFor="role">Role</Label>
                    <div className="relative">
                      <select
                          id="role"
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                      </select>
                      {/* Chevron Icon Custom untuk Native Select */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                      </div>
                    </div>
                </div>
                {/* ----------------------------------------------------- */}

                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}