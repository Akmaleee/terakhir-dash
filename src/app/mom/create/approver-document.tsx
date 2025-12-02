"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { CreateApproverModal } from "@/components/approver/create-modal";

interface Approver {
  id: number;
  name: string;
  type: string;
}

interface ApproverDocumentProps {
  form: { approvers: { approver_id: number | null }[] };
  handleChange: (field: string, value: any) => void;
}

export function ApproverDocument({ form, handleChange }: ApproverDocumentProps) {
  const [approversList, setApproversList] = useState<Approver[]>([]);

  // Ambil data approver dari API
  const fetchApprovers = async () => {
    try {
      const res = await fetch("/api/approver");
      const data = await res.json();
      setApproversList(data);
    } catch (err) {
      console.error("❌ Error fetching approvers:", err);
    }
  };

  useEffect(() => {
    fetchApprovers();
  }, []);

  // Handler perubahan dropdown
  function handleApproverChange(index: number, value: number) {
    const updated = [...form.approvers];
    updated[index] = { approver_id: value };
    handleChange("approvers", updated);
  }

  // Tambah field approver baru
  function addApproverField() {
    handleChange("approvers", [...form.approvers, { approver_id: null }]);
  }

  // Hapus field approver
  function removeApproverField(index: number) {
    handleChange(
      "approvers",
      form.approvers.filter((_, i) => i !== index)
    );
  }

  // Callback setelah approver baru dibuat lewat modal
  function handleApproverCreated(newApprover: Approver) {
    setApproversList((prev) => [...prev, newApprover]);
  }

  // Approver yang sudah dipilih tidak bisa dipilih lagi
  const selectedIds = form.approvers
    .map((a) => a.approver_id)
    .filter((id): id is number => id !== null);

  return (
    <div className="w-full bg-white rounded-2xl shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4">Approver</h2>

      <div className="flex flex-col gap-4">
        {form.approvers.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-[3fr_auto] gap-3 items-end"
          >
            <div className="flex items-center gap-2">
              <select
                value={item.approver_id ?? ""}
                onChange={(e) =>
                  handleApproverChange(index, Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih approver...</option>
                {approversList.map((a) => (
                  <option
                    key={a.id}
                    value={a.id}
                    disabled={selectedIds.includes(a.id)} // 🚫 disable kalau udah dipilih
                  >
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>

              {/* modal create approver — udah punya tombol + sendiri */}
              <CreateApproverModal
                onApproverCreated={handleApproverCreated}
              />
            </div>

            <Button
              type="button"
              variant="destructive"
              onClick={() => removeApproverField(index)}
              className="h-10 w-10 p-2"
              disabled={form.approvers.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addApproverField}
        className="mt-4"
      >
        + Tambah Field Approver
      </Button>
    </div>
  );
}
