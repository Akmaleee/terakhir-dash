// src/components/approver/edit-modal.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// KITA TIDAK LAGI MENGGUNAKAN SHADCN SELECT DI SINI
// import { Select, ... } from "@/components/ui/select"; 

interface Approver {
  id: number;
  name: string;
  type: string | null;
  email: string | null;
  jabatan: string | null;
  nik: string | null;
}

interface EditApproverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approver: Approver | null;
  onSuccess?: () => void;
}

export default function EditApproverModal({
  open,
  onOpenChange,
  approver,
  onSuccess,
}: EditApproverModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "internal",
    email: "",
    jabatan: "",
    nik: "",
  });

  // Reset form saat modal dibuka atau data approver berubah
  useEffect(() => {
    if (approver) {
      setFormData({
        name: approver.name || "",
        type: approver.type || "internal",
        email: approver.email || "",
        jabatan: approver.jabatan || "",
        nik: approver.nik || "",
      });
    }
  }, [approver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approver) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/approver/${approver.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Gagal mengupdate data");
      }

      onOpenChange(false);
      router.refresh(); // Refresh data server component (jika ada)
      if (onSuccess) onSuccess(); // Callback untuk refresh tabel
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan perubahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Approver</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Nama */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nama
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-3"
              required
            />
          </div>

          {/* Tipe Approver (Native Select) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Tipe
            </Label>
            <div className="col-span-3">
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="internal">Internal (Telkomsat)</option>
                <option value="external">Eksternal (Mitra)</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="col-span-3"
            />
          </div>

          {/* Jabatan */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="jabatan" className="text-right">
              Jabatan
            </Label>
            <Input
              id="jabatan"
              value={formData.jabatan}
              onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
              className="col-span-3"
            />
          </div>

          {/* NIK */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nik" className="text-right">
              NIK
            </Label>
            <Input
              id="nik"
              value={formData.nik}
              onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
              className="col-span-3"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}