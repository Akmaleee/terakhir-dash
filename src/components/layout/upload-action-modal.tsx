"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";

export function UploadActionModal({
  open,
  onClose,
  onSubmit,
  stepName,
  statusName,
  actionName
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File) => void;
  stepName: string;
  statusName: string;
  actionName: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDoSubmit = async () => {
    if (!file) return;
    setLoading(true);
    await onSubmit(file);
    setLoading(false);
    onClose();
    setFile(null);
  };

  return (
    <Transition show={open} appear as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Background blur */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal content */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 shadow-xl">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                {actionName}
              </Dialog.Title>

              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Step: <b>{stepName}</b> — Status saat ini: <b>{statusName}</b>
              </p>

              <div className="mt-4 space-y-4">

                {/* FILE INPUT — sama persis */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    File Dokumen
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="
                      w-full rounded-md border border-gray-300 dark:border-gray-700 
                      px-3 py-2 text-sm
                      bg-white dark:bg-neutral-800
                      file:mr-4 file:rounded-md file:border-0 
                      file:bg-gray-100 file:px-3 file:py-1 file:text-sm 
                      file:font-semibold hover:file:bg-gray-200
                      dark:file:bg-gray-800 dark:file:text-gray-200
                    "
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>

                <Button
                  onClick={handleDoSubmit}
                  disabled={!file || loading}
                >
                  {loading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
