"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPanel, DialogTitle, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface ActionTableUploadProps {
  row: any;
  onUpload: (file: File, row: any) => void;
}

export function ActionTableUpload({ row, onUpload }: ActionTableUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const step = row?.progress?.step?.name || "-";
  const status = row?.progress?.status?.name || "-";

  const handleSubmit = () => {
    if (!file) return alert("Silakan pilih file terlebih dahulu!");

    onUpload(file, row);
    setOpen(false);
    setFile(null);
  };

  // ❗ CONDITION: hanya muncul di status Sirkulir TSAT & Signing Mitra
  const shouldShowButton = ["sirkulir tsat", "signing mitra"].includes(
    status.trim().toLowerCase()
  );

  if (!shouldShowButton) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent"
      >
        Upload Dokumen
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setOpen}>
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
              <DialogTitle className="text-lg font-semibold mb-3">
                Upload Dokumen – {step}
              </DialogTitle>

              <p className="text-sm text-muted-foreground mb-4">
                Status saat ini: <b>{status}</b>
              </p>

              <input
                type="file"
                className="w-full border p-2 rounded mb-4"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSubmit}>Upload</Button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
