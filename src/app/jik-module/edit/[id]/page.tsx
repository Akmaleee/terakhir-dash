// src/app/jik-module/edit/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { JSONContent } from "@tiptap/react";

// Impor tipe 'Form' dan 'JikApprover' dari 'detail-document'
import DetailDocument, {
  Form,
  JikApprover, // <-- Impor tipe JikApprover
} from "../../create/detail-document";
import ContentDocument, {
  ContentSection,
} from "../../create/content-document";
import { JikApproverForm } from "../../create/approver-document";

// Buat state default untuk Form
const defaultForm: Form = {
  companyId: null,
  jikTitle: "",
  unitName: "",
  initiativePartnership: "",
  investValue: null,
  contractDuration: null,
  jik_approvers: [],
};

export default function JikEditPage() {
  // Inisialisasi state dengan 'defaultForm'
  const [form, setForm] = useState<Form>(defaultForm);

  const [initialSections, setInitialSections] = useState<ContentSection[]>([]);
  const [updatedSections, setUpdatedSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const { id } = params;

  // --- 1. FETCH DATA EKSISTING ---
  useEffect(() => {
    if (id) {
      setPageLoading(true);
      fetch(`/api/jik/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Gagal memuat data");
          }
          return res.json();
        })
        .then((data) => {
          const formattedForm: Form = {
            companyId: data.company_id,
            jikTitle: data.judul,
            unitName: data.nama_unit,
            initiativePartnership: data.initiative_partnership,
            investValue: data.invest_value ? Number(data.invest_value) : null,
            contractDuration: data.contract_duration_years,

            // [PERBAIKAN] Hanya sertakan properti yang ada di tipe 'JikApprover'
            jik_approvers:
              data.jik_approvers?.map(
                (ja: any): JikApprover => ({
                  approverId: ja.approver.id,
                  type: ja.approver_type,
                  // 'name', 'email', 'jabatan', 'nik' dihapus
                  // karena tidak ada di dalam tipe 'JikApprover'
                })
              ) || [],
          };

          setForm(formattedForm);

          const sections = data.document_initiative || [];
          setInitialSections(sections);
          setUpdatedSections(sections);

          setError(null);
        })
        .catch((err) => {
          console.error("❌ Error fetching JIK:", err);
          setError(err.message);
        })
        .finally(() => {
          setPageLoading(false);
        });
    }
  }, [id]);

  function handleChange(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // --- 2. FUNGSI SUBMIT (UPDATE) ---
  async function handleSubmit(isFinish: 0 | 1) {
    if (!form) return;

    const companyId = form.companyId;
    const jikTitle = form.jikTitle?.trim() ?? "";
    const unitName = form.unitName?.trim() ?? "";

    if (!companyId || !jikTitle || !unitName) {
      alert("Company Name, JIK Title, dan Unit Name wajib diisi.");
      return;
    }

    const investValue =
      form.investValue !== null && form.investValue !== undefined
        ? String(form.investValue)
        : undefined;

    const payload = {
      companyId,
      jikTitle,
      unitName,
      initiativePartnership: form.initiativePartnership?.trim() || undefined,
      investValue,
      contractDurationYears: form.contractDuration,
      jik_approvers: form.jik_approvers.map((a) => ({
        approverId: a.approverId, // Kirim 'approverId' (camelCase)
        type: a.type,
      })),
      sections: updatedSections.map((s) => ({
        title: s.title,
        content: s.content as JSONContent,
      })),
      is_finish: isFinish,
    };

    console.log("🔹 Payload update yang dikirim:", payload);

    setLoading(true);
    try {
      const res = await fetch(`/api/jik/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.json();
        throw new Error(`Gagal menyimpan dokumen: ${errText.error || res.statusText}`);
      }

      console.log("✅ Response update dari server:", await res.json());

      router.push(`/jik-module/list-jik`);
    } catch (err: unknown) {
      console.error("❌ Error saat update:", err);
      if (err instanceof Error) {
        alert("Gagal update: " + err.message);
      } else {
        alert("Gagal update: Terjadi error tidak diketahui.");
      }
    } finally {
      setLoading(false);
    }
  }

  // --- 3. RENDER ---
  if (pageLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Memuat data JIK...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-md">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <>
      <DetailDocument form={form} setForm={setForm} />

      <div className="bg-white w-full rounded-2xl shadow p-6 mt-6">
        <ContentDocument
          onChange={setUpdatedSections}
          initialContent={initialSections}
        />
      </div>

      <JikApproverForm form={form} handleChange={handleChange} />

      <div className="bg-white w-full rounded-2xl shadow p-6 mt-6">
        <div className="mt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit(0)} // ⬅️ Simpan draft
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Save Draft"}
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit(1)} // ⬅️ Update dokumen
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Document"}
          </Button>
        </div>
      </div>
    </>
  );
}