"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusTracker } from "./status-tracker";
import { ActionTable } from "./action-table";
import { UploadModal } from "../input/upload-modal";
import { UploadActionModal } from "./upload-action-modal";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Pastikan install lucide-react

interface DataTableProps {
  caption?: string;
  columns: { key: string; label: string }[];
  data: Record<string, any>[]; // initial data
  type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onCustomAction?: (action: string, row: any) => void;
  generatingId?: number | null;
  deletingId?: number | null;
  initialPageSize?: number; // Prop baru (opsional)
}

export function DataTable({
  caption,
  columns,
  data,
  type = "default",
  onView,
  onEdit,
  onDelete,
  onCustomAction,
  generatingId,
  deletingId,
  initialPageSize = 10, // Default 10 item per halaman
}: DataTableProps) {
  // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
  const [rows, setRows] = useState<Record<string, any>[]>(data);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // 🧠 State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(initialPageSize);

  // kalau prop data berubah dari luar, update state dan reset ke halaman 1
  useEffect(() => {
    setRows(data);
    setCurrentPage(1); // Reset ke halaman 1 jika data baru masuk (misal hasil filter/refresh)
  }, [data]);

  // --- LOGIC PAGINATION ---
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = rows.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };
  // ------------------------

  // ambil nested value dari object
  const getValue = (obj: any, path: string) =>
    path.split(".").reduce((acc, part) => acc && acc[part], obj);

  // tampilkan kolom status untuk tipe tertentu
  const showStatus = ["mom", "nda", "company", "msa", "mou", "jik"].includes(
    type.toLowerCase()
  );

  // state untuk upload sign mitra & sirkulir tsat
  const [uploadAction, setUploadAction] = useState<string>("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadRow, setUploadRow] = useState<any>(null);

  const handleCustomAction = async (action: string, row: any) => {
    // 💡 Kirim aksi ke 'list-jik/page.tsx' untuk ditangani
    if (onCustomAction) {
      onCustomAction(action, row);
    }

    // 👉 NDA/MOU/MSA khusus upload Sirkulir dan Signed (PASTI masuk ke sini)
    if (action === "Upload Sirkulir" || action === "Upload Signed") {
      setUploadAction(action);
      setUploadRow(row);
      setUploadModalOpen(true);
      return;
    }

    // Logika 'Upload' dipisah karena menggunakan modal
    if (action === "Upload") {
      setSelectedRow(row);
      setUploadOpen(true);
      return; // stop di sini
    }

    // Aksi-aksi ini ditangani di page.tsx, jadi jangan panggil API progress
    if (
      action === "Print" ||
      action === "Check" ||
      action === "Generate DOCX Signed" ||
      action === "Generate DOCX" ||
      action === "Edit" ||
      action === "Delete" ||
      action === "View" // View juga tidak
    ) {
      return; // stop di sini
    }

    // Aksi-aksi sisanya (Send, Approve, Sign) akan memanggil API progress
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          type: row.progress?.step?.name || type,
          action,
          current_status: row.progress?.status?.name,
        }),
      });

      if (!res.ok) throw new Error("Failed to update progress");

      const updated = await res.json();
      console.log("✅ Updated:", updated);

      // 🔁 Re-fetch data tabel sesuai tipe dokumen
      const refetchUrl = `/api/${type.toLowerCase()}`;
      const refreshRes = await fetch(refetchUrl);

      if (!refreshRes.ok) throw new Error("Failed to refetch data");

      const freshData = await refreshRes.json();

      if (Array.isArray(freshData)) {
        setRows(freshData);
        // Opsional: Tetap di halaman yang sama atau reset
        // setCurrentPage(1); 
      } else {
        console.error("Refetched data is not an array:", freshData);
      }
    } catch (err) {
      console.error("❌ Gagal update progress:", err);
    }
  };

  const handleUpload = async (file: File) => {
    if (!selectedRow) return;
    console.log("📁 Uploading file for:", selectedRow.id);

    try {
      // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
      const formData = new FormData();
      formData.append("files", file);

      const uploadRes = await fetch("/api/uploads/attachment", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload gagal");

      const uploaded = await uploadRes.json();
      const fileUrl = uploaded?.url || uploaded?.[0]?.url;

      console.log("✅ File uploaded:", fileUrl);

      // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
      const progressRes = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRow.id,
          type: selectedRow.progress?.step?.name || type,
          action: "Upload",
          current_status: selectedRow.progress?.status?.name,
          url: fileUrl, // 🆕 kirim URL hasil upload
        }),
      });

      if (!progressRes.ok) throw new Error("Gagal update progress");
      const updated = await progressRes.json();

      console.log("🧾 Progress updated:", updated);

      // --- 3️⃣ Re-fetch data untuk refresh tabel ---
      const refetch = await fetch(`/api/${type.toLowerCase()}`);
      const fresh = await refetch.json();

      if (Array.isArray(fresh)) {
        setRows(fresh);
      }
    } catch (err) {
      console.error("❌ Gagal upload atau update progress:", err);
    }

    setUploadOpen(false);
  };

  // handler download document nda/mou/msa
  const handleDownload = (row: any) => {
    console.log("DOWNLOAD Document:", row);

    // Cari URL dari berbagai kemungkinan struktur
    const url =
      row?.documents?.[0]?.document_url ||
      row?.document_url ||
      row?.progress?.documents?.[0]?.document_url ||
      "";

    console.log("Download URL:", url);

    if (!url) {
      alert("File tidak ditemukan");
      return;
    }

    window.open(url, "_blank");
  };

  const handleUploadSpecial = async (file: File) => {
    if (!uploadRow) return;

    try {
      // 1. Upload file ke MinIO / S3
      const formData = new FormData();
      formData.append("files", file);

      const uploadRes = await fetch("/api/uploads/attachment", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        alert("🔥 Upload gagal:\n\n" + text);
        return;
      }

      const uploaded = await uploadRes.json();
      const fileUrl = uploaded?.url || uploaded?.[0]?.url;
      console.log("Uploaded:", fileUrl);

      // 2. Submit progress
      let progressRes;
      try {
        progressRes = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: uploadRow.id,
            type: uploadRow.progress?.step?.name || type,
            action: "Upload", // Upload Sirkulir / Upload Signed
            current_status: uploadRow.progress?.status?.name,
            url: fileUrl,
          }),
        });
      } catch (networkErr) {
        alert("🔥 NETWORK ERROR ke /api/progress:\n\n" + networkErr);
        console.error("NETWORK ERROR:", networkErr);
        return;
      }

      // Jika server balikin error:
      if (!progressRes.ok) {
        let errorText = "";
        try {
          errorText = await progressRes.text();
        } catch {
          errorText = "Tidak bisa membaca response error dari server.";
        }

        alert(
          "🔥 SERVER ERROR /api/progress (STATUS " +
            progressRes.status +
            "):\n\n" +
            errorText
        );
        console.error("SERVER ERROR:", errorText);
        return;
      }

      let updated;
      try {
        updated = await progressRes.json();
      } catch (parseErr) {
        alert("🔥 PARSE ERROR /api/progress:\n\n" + parseErr);
        console.error("PARSE ERROR:", parseErr);
        return;
      }

      console.log("SUKSES UPDATE:", updated);

      // 3. Refresh table
      const refetch = await fetch(`/api/${type.toLowerCase()}`);
      const fresh = await refetch.json();
      setRows(Array.isArray(fresh) ? fresh : []);
    } catch (err) {
      alert("🔥 UNHANDLED ERROR:\n\n" + err);
      console.error("Upload special gagal:", err);
    }

    setUploadModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            {caption && <TableCaption>{caption}</TableCaption>}

            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">No</TableHead>

                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}

                {showStatus && <TableHead>Status</TableHead>}

                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedRows.length > 0 ? (
                // ✨ Menggunakan paginatedRows, bukan rows
                paginatedRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center font-medium">
                      {/* ✨ Hitung Index Global: (Page-1) * Limit + Index + 1 */}
                      {(currentPage - 1) * itemsPerPage + i + 1}
                    </TableCell>

                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {getValue(row, col.key) ?? "-"}
                      </TableCell>
                    ))}

                    {showStatus && (
                      <TableCell>
                        <StatusTracker
                          stepName={row.progress?.step?.name || type}
                          currentStatus={
                            row.progress?.status?.name ||
                            row.status?.name ||
                            "Draft"
                          }
                        />
                      </TableCell>
                    )}

                    <TableCell className="text-right">
                      <ActionTable
                        row={row}
                        type={type}
                        onView={onView}
                        onEdit={onEdit}
                        onPrint={handleDownload}
                        onDelete={onDelete}
                        onCustomAction={handleCustomAction}
                        generatingId={generatingId}
                        deletingId={deletingId}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showStatus ? 3 : 2)}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ✨ UI PAGINATION */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, rows.length)} of {rows.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                onClick={goToPrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <button
                className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
        title={`Upload Dokumen ${type.toUpperCase()}`}
      />

      <UploadActionModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        actionName={uploadAction}
        stepName={uploadRow?.progress?.step?.name || ""}
        statusName={uploadRow?.progress?.status?.name || ""}
        onSubmit={(file) => handleUploadSpecial(file)}
      />
    </>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { StatusTracker } from "./status-tracker";
// import { ActionTable } from "./action-table";
// import { UploadModal } from "../input/upload-modal";
// import { UploadActionModal } from "./upload-action-modal";

// interface DataTableProps {
//   caption?: string;
//   columns: { key: string; label: string }[];
//   data: Record<string, any>[]; // initial data
//   type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void; 
//   generatingId?: number | null;
//   deletingId?: number | null; 
// }

// export function DataTable({
//   caption,
//   columns,
//   data,
//   type = "default",
//   onView,
//   onEdit,
//   onDelete,
//   onCustomAction, 
//   generatingId,
//   deletingId, 
// }: DataTableProps) {
//   // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
//   const [rows, setRows] = useState<Record<string, any>[]>(data);
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [selectedRow, setSelectedRow] = useState<any>(null);

//   // kalau prop data berubah dari luar, update state juga
//   useEffect(() => {
//     setRows(data);
//   }, [data]);

//   // ambil nested value dari object
//   const getValue = (obj: any, path: string) =>
//     path.split(".").reduce((acc, part) => acc && acc[part], obj);

//   // tampilkan kolom status untuk tipe tertentu
//   const showStatus = ["mom", "nda", "company", "msa", "mou", "jik"].includes(
//     type.toLowerCase()
//   );

//   // state untuk upload sign mitra & sirkulir tsat
//   const [uploadAction, setUploadAction] = useState<string>("");
//   const [uploadModalOpen, setUploadModalOpen] = useState(false);
//   const [uploadRow, setUploadRow] = useState<any>(null);

//   const handleCustomAction = async (action: string, row: any) => {
//     // 💡 Kirim aksi ke 'list-jik/page.tsx' untuk ditangani
//     if (onCustomAction) {
//       onCustomAction(action, row);
//     }

//     // 👉 NDA/MOU/MSA khusus upload Sirkulir dan Signed (PASTI masuk ke sini)
//     if (action === "Upload Sirkulir" || action === "Upload Signed") {
//       setUploadAction(action);
//       setUploadRow(row);
//       setUploadModalOpen(true);
//       return;
//     }

//     // Logika 'Upload' dipisah karena menggunakan modal
//     if (action === "Upload") {
//       setSelectedRow(row);
//       setUploadOpen(true);
//       return; // stop di sini
//     }

//     // Aksi-aksi ini ditangani di page.tsx, jadi jangan panggil API progress
//     if (
//       action === "Print" ||
//       action === "Check" ||
//       action === "Generate DOCX Signed" ||
//       action === "Generate DOCX" ||
//       action === "Edit" ||
//       action === "Delete" ||
//       action === "View" // View juga tidak
//     ) {
//       return; // stop di sini
//     }

//     // Aksi-aksi sisanya (Send, Approve, Sign) akan memanggil API progress
//     try {
//       const res = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: row.id,
//           type: row.progress?.step?.name || type,
//           action,
//           current_status: row.progress?.status?.name,
//         }),
//       });

//       if (!res.ok) throw new Error("Failed to update progress");

//       const updated = await res.json();
//       console.log("✅ Updated:", updated);

//       // 🔁 Re-fetch data tabel sesuai tipe dokumen
//       const refetchUrl = `/api/${type.toLowerCase()}`;
//       const refreshRes = await fetch(refetchUrl);

//       if (!refreshRes.ok) throw new Error("Failed to refetch data");

//       const freshData = await refreshRes.json();
      
//       if (Array.isArray(freshData)) {
//         setRows(freshData);
//       } else {
//         console.error("Refetched data is not an array:", freshData);
//       }

//     } catch (err) {
//       console.error("❌ Gagal update progress:", err);
//     }
//   };

//   const handleUpload = async (file: File) => {
//     if (!selectedRow) return;
//     console.log("📁 Uploading file for:", selectedRow.id);

//     try {
//       // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
//       const formData = new FormData();
//       formData.append("files", file);

//       const uploadRes = await fetch("/api/uploads/attachment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!uploadRes.ok) throw new Error("Upload gagal");

//       const uploaded = await uploadRes.json();
//       const fileUrl = uploaded?.url || uploaded?.[0]?.url;

//       console.log("✅ File uploaded:", fileUrl);

//       // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
//       const progressRes = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: selectedRow.id,
//           type: selectedRow.progress?.step?.name || type,
//           action: "Upload",
//           current_status: selectedRow.progress?.status?.name,
//           url: fileUrl, // 🆕 kirim URL hasil upload
//         }),
//       });

//       if (!progressRes.ok) throw new Error("Gagal update progress");
//       const updated = await progressRes.json();

//       console.log("🧾 Progress updated:", updated);

//       // --- 3️⃣ Re-fetch data untuk refresh tabel ---
//       const refetch = await fetch(`/api/${type.toLowerCase()}`);
//       const fresh = await refetch.json();
      
//       if (Array.isArray(fresh)) {
//           setRows(fresh);
//       }

//     } catch (err) {
//       console.error("❌ Gagal upload atau update progress:", err);
//     }

//     setUploadOpen(false);
//   };

//   // handler download document nda/mou/msa
//   const handleDownload = (row: any) => {
//     console.log("DOWNLOAD Document:", row);

//     // Cari URL dari berbagai kemungkinan struktur
//     const url =
//       row?.documents?.[0]?.document_url || 
//       row?.document_url || 
//       row?.progress?.documents?.[0]?.document_url ||
//       "";

//     console.log("Download URL:", url);

//     if (!url) {
//       alert("File tidak ditemukan");
//       return;
//     }

//     window.open(url, "_blank");
//   };

//   const handleUploadSpecial = async (file: File) => {
//     if (!uploadRow) return;

//     try {
//       // 1. Upload file ke MinIO / S3
//       const formData = new FormData();
//       formData.append("files", file);

//       const uploadRes = await fetch("/api/uploads/attachment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!uploadRes.ok) {
//         const text = await uploadRes.text();
//         alert("🔥 Upload gagal:\n\n" + text);
//         return;
//       }

//       const uploaded = await uploadRes.json();
//       const fileUrl = uploaded?.url || uploaded?.[0]?.url;
//       console.log("Uploaded:", fileUrl);

//       // 2. Submit progress
//       let progressRes;
//       try {
//         progressRes = await fetch("/api/progress", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             id: uploadRow.id,
//             type: uploadRow.progress?.step?.name || type,
//             action: "Upload", // Upload Sirkulir / Upload Signed
//             current_status: uploadRow.progress?.status?.name,
//             url: fileUrl,
//           }),
//         });
//       } catch (networkErr) {
//         alert("🔥 NETWORK ERROR ke /api/progress:\n\n" + networkErr);
//         console.error("NETWORK ERROR:", networkErr);
//         return;
//       }

//       // Jika server balikin error:
//       if (!progressRes.ok) {
//         let errorText = "";
//         try {
//           errorText = await progressRes.text();
//         } catch {
//           errorText = "Tidak bisa membaca response error dari server.";
//         }

//         alert(
//           "🔥 SERVER ERROR /api/progress (STATUS " +
//             progressRes.status +
//             "):\n\n" +
//             errorText
//         );
//         console.error("SERVER ERROR:", errorText);
//         return;
//       }

//       let updated;
//       try {
//         updated = await progressRes.json();
//       } catch (parseErr) {
//         alert("🔥 PARSE ERROR /api/progress:\n\n" + parseErr);
//         console.error("PARSE ERROR:", parseErr);
//         return;
//       }

//       console.log("SUKSES UPDATE:", updated);

//       // 3. Refresh table
//       const refetch = await fetch(`/api/${type.toLowerCase()}`);
//       const fresh = await refetch.json();
//       setRows(Array.isArray(fresh) ? fresh : []);

//     } catch (err) {
//       alert("🔥 UNHANDLED ERROR:\n\n" + err);
//       console.error("Upload special gagal:", err);
//     }

//     setUploadModalOpen(false);
//   };



//   return (
//     <>
//       <div className="overflow-x-auto rounded-xl border border-border">
//         <Table>
//           {caption && <TableCaption>{caption}</TableCaption>}

//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-[50px] text-center">No</TableHead>

//               {columns.map((col) => (
//                 <TableHead key={col.key}>{col.label}</TableHead>
//               ))}

//               {showStatus && <TableHead>Status</TableHead>}

//               <TableHead className="w-[60px]"></TableHead>
//             </TableRow>
//           </TableHeader>

//           <TableBody>
//             {rows.length > 0 ? (
//               rows.map((row, i) => (
//                 <TableRow key={i}>
//                   <TableCell className="text-center font-medium">
//                     {i + 1}
//                   </TableCell>

//                   {columns.map((col) => (
//                     <TableCell key={col.key}>
//                       {getValue(row, col.key) ?? "-"}
//                     </TableCell>
//                   ))}

//                   {showStatus && (
//                     <TableCell>
//                       <StatusTracker
//                         stepName={row.progress?.step?.name || type}
//                         currentStatus={
//                           row.progress?.status?.name ||
//                           row.status?.name ||
//                           "Draft"
//                         }
//                       />
//                     </TableCell>
//                   )}

//                   <TableCell className="text-right">
//                     <ActionTable
//                       row={row}
//                       type={type}
//                       onView={onView}
//                       onEdit={onEdit}
//                       onPrint={handleDownload}
//                       onDelete={onDelete}
//                       onCustomAction={handleCustomAction}
//                       generatingId={generatingId}
//                       deletingId={deletingId} 
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell
//                   colSpan={columns.length + (showStatus ? 3 : 2)}
//                   className="text-center py-6 text-muted-foreground"
//                 >
//                   No data available
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       <UploadModal
//         open={uploadOpen}
//         onClose={() => setUploadOpen(false)}
//         onSubmit={handleUpload}
//         title={`Upload Dokumen ${type.toUpperCase()}`}
//       />

//       <UploadActionModal
//         open={uploadModalOpen}
//         onClose={() => setUploadModalOpen(false)}
//         actionName={uploadAction}
//         stepName={uploadRow?.progress?.step?.name || ""}
//         statusName={uploadRow?.progress?.status?.name || ""}
//         onSubmit={(file) => handleUploadSpecial(file)}
//       />
//     </>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { StatusTracker } from "./status-tracker";
// import { ActionTable } from "./action-table";
// import { UploadModal } from "../input/upload-modal";

// interface DataTableProps {
//   caption?: string;
//   columns: { key: string; label: string }[];
//   data: Record<string, any>[]; // initial data
//   type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void; // DARI KODE ANDA
//   generatingId?: number | null;
//   deletingId?: number | null; // <-- 1. TAMBAHKAN PROP INI
// }

// export function DataTable({
//   caption,
//   columns,
//   data,
//   type = "default",
//   onView,
//   onEdit,
//   onDelete,
//   onCustomAction, // DARI KODE ANDA
//   generatingId,
//   deletingId, // <-- 2. TERIMA PROP INI
// }: DataTableProps) {
//   // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
//   const [rows, setRows] = useState<Record<string, any>[]>(data);
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [selectedRow, setSelectedRow] = useState<any>(null);

//   // kalau prop data berubah dari luar, update state juga
//   useEffect(() => {
//     setRows(data);
//   }, [data]);

//   // ambil nested value dari object
//   const getValue = (obj: any, path: string) =>
//     path.split(".").reduce((acc, part) => acc && acc[part], obj);

//   // tampilkan kolom status untuk tipe tertentu
//   const showStatus = ["mom", "nda", "company", "msa", "mou", "jik"].includes(
//     type.toLowerCase()
//   );

//   // 🔁 fungsi handle untuk aksi custom (Send / Approve / Upload / Sign)
//   // --- MODIFIKASI: Kirim 'onCustomAction' langsung ke ActionTable ---
//   const handleCustomAction = async (action: string, row: any) => {
//     // 💡 'Generate DOCX', 'Edit', 'Delete' akan ditangani oleh 'list-jik/page.tsx'
//     //    Kita hanya perlu mem-bypass-nya ke onCustomAction
//     if (onCustomAction) {
//       onCustomAction(action, row);
//     }

//     // Logika 'Upload' dipisah karena menggunakan modal
//     if (action === "Upload") {
//       setSelectedRow(row);
//       setUploadOpen(true);
//       return; // stop di sini
//     }

//     // Logika 'Generate DOCX', 'Edit', 'Delete' tidak boleh memanggil API progress
//     if (
//       action === "Generate DOCX" ||
//       action === "Edit" ||
//       action === "Delete" ||
//       action === "View" // View juga tidak
//     ) {
//       return; // stop di sini
//     }

//     try {
//       const res = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: row.id,
//           type: row.progress?.step?.name || type,
//           action,
//           current_status: row.progress?.status?.name,
//         }),
//       });

//       if (!res.ok) throw new Error("Failed to update progress");

//       const updated = await res.json();
//       console.log("✅ Updated:", updated);

//       // 🔁 Re-fetch data tabel sesuai tipe dokumen
//       const refetchUrl = `/api/${type.toLowerCase()}`;
//       const refreshRes = await fetch(refetchUrl);

//       if (!refreshRes.ok) throw new Error("Failed to refetch data");

//       const freshData = await refreshRes.json();
      
//       // Cek jika data adalah array sebelum update
//       if (Array.isArray(freshData)) {
//         setRows(freshData);
//       } else {
//         console.error("Refetched data is not an array:", freshData);
//       }

//     } catch (err) {
//       console.error("❌ Gagal update progress:", err);
//     }
//   };

//   const handleUpload = async (file: File) => {
//     if (!selectedRow) return;
//     console.log("📁 Uploading file for:", selectedRow.id);

//     try {
//       // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
//       const formData = new FormData();
//       formData.append("files", file);

//       const uploadRes = await fetch("/api/uploads/attachment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!uploadRes.ok) throw new Error("Upload gagal");

//       const uploaded = await uploadRes.json();
//       const fileUrl = uploaded?.url || uploaded?.[0]?.url;

//       console.log("✅ File uploaded:", fileUrl);

//       // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
//       const progressRes = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: selectedRow.id,
//           type: selectedRow.progress?.step?.name || type,
//           action: "Upload",
//           current_status: selectedRow.progress?.status?.name,
//           url: fileUrl, // 🆕 kirim URL hasil upload
//         }),
//       });

//       if (!progressRes.ok) throw new Error("Gagal update progress");
//       const updated = await progressRes.json();

//       console.log("🧾 Progress updated:", updated);

//       // --- 3️⃣ Re-fetch data untuk refresh tabel ---
//       const refetch = await fetch(`/api/${type.toLowerCase()}`);
//       const fresh = await refetch.json();
      
//       if (Array.isArray(fresh)) {
//          setRows(fresh);
//       }

//     } catch (err) {
//       console.error("❌ Gagal upload atau update progress:", err);
//     }

//     setUploadOpen(false);
//   };

//   return (
//     <>
//       <div className="overflow-x-auto rounded-xl border border-border">
//         <Table>
//           {caption && <TableCaption>{caption}</TableCaption>}

//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-[50px] text-center">No</TableHead>

//               {columns.map((col) => (
//                 <TableHead key={col.key}>{col.label}</TableHead>
//               ))}

//               {showStatus && <TableHead>Status</TableHead>}

//               <TableHead className="w-[60px]"></TableHead>
//             </TableRow>
//           </TableHeader>

//           <TableBody>
//             {rows.length > 0 ? (
//               rows.map((row, i) => (
//                 <TableRow key={i}>
//                   <TableCell className="text-center font-medium">
//                     {i + 1}
//                   </TableCell>

//                   {columns.map((col) => (
//                     <TableCell key={col.key}>
//                       {getValue(row, col.key) ?? "-"}
//                     </TableCell>
//                   ))}

//                   {showStatus && (
//                     <TableCell>
//                       <StatusTracker
//                         stepName={row.progress?.step?.name || type}
//                         currentStatus={
//                           row.progress?.status?.name ||
//                           row.status?.name ||
//                           "Draft"
//                         }
//                       />
//                     </TableCell>
//                   )}

//                   <TableCell className="text-right">
//                     <ActionTable
//                       row={row}
//                       type={type}
//                       onView={onView}
//                       onEdit={onEdit}
//                       onDelete={onDelete}
//                       onCustomAction={handleCustomAction}
//                       generatingId={generatingId}
//                       deletingId={deletingId} // <-- 3. KIRIM PROP KE ACTIONTABLE
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell
//                   colSpan={columns.length + (showStatus ? 3 : 2)}
//                   className="text-center py-6 text-muted-foreground"
//                 >
//                   No data available
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       <UploadModal
//         open={uploadOpen}
//         onClose={() => setUploadOpen(false)}
//         onSubmit={handleUpload}
//         title={`Upload Dokumen ${type.toUpperCase()}`}
//       />
//     </>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { StatusTracker } from "./status-tracker";
// import { ActionTable } from "./action-table";
// import { UploadModal } from "../input/upload-modal";

// interface DataTableProps {
//   caption?: string;
//   columns: { key: string; label: string }[];
//   data: Record<string, any>[]; // initial data
//   type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void; // DARI KODE ANDA
//   generatingId?: number | null; // <-- 1. TAMBAHKAN PROP INI
// }

// export function DataTable({
//   caption,
//   columns,
//   data,
//   type = "default",
//   onView,
//   onEdit,
//   onDelete,
//   onCustomAction, // DARI KODE ANDA
//   generatingId, // <-- 2. TERIMA PROP INI
// }: DataTableProps) {
//   // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
//   const [rows, setRows] = useState<Record<string, any>[]>(data);
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [selectedRow, setSelectedRow] = useState<any>(null);

//   // kalau prop data berubah dari luar, update state juga
//   useEffect(() => {
//     setRows(data);
//   }, [data]);

//   // ambil nested value dari object
//   const getValue = (obj: any, path: string) =>
//     path.split(".").reduce((acc, part) => acc && acc[part], obj);

//   // tampilkan kolom status untuk tipe tertentu
//   const showStatus =
//     ["mom", "nda", "company", "msa", "mou", "jik"].includes(type.toLowerCase());

//   // 🔁 fungsi handle untuk aksi custom (Send / Approve / Upload / Sign)
//   // --- MODIFIKASI: Kirim 'onCustomAction' langsung ke ActionTable ---
//   const handleCustomAction = async (action: string, row: any) => {
//     // 💡 'Generate DOCX' akan ditangani oleh 'list-jik/page.tsx'
//     //    Kita hanya perlu mem-bypass-nya ke onCustomAction
//     if (onCustomAction) {
//       onCustomAction(action, row);
//     }
    
//     // Logika 'Upload' dipisah karena menggunakan modal
//     if (action === "Upload") {
//       setSelectedRow(row);
//       setUploadOpen(true);
//       return; // stop di sini
//     }
    
//     // Logika 'Generate DOCX' tidak boleh memanggil API progress
//     if (action === "Generate DOCX") {
//       return; // stop di sini
//     }

//     try {
//       const res = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: row.id,
//           type: row.progress?.step?.name || type,
//           action,
//           current_status: row.progress?.status?.name,
//         }),
//       });

//       if (!res.ok) throw new Error("Failed to update progress");

//       const updated = await res.json();
//       console.log("✅ Updated:", updated);

//       // 🔁 Re-fetch data tabel sesuai tipe dokumen
//       const refetchUrl = `/api/${type.toLowerCase()}`;
//       const refreshRes = await fetch(refetchUrl);

//       if (!refreshRes.ok) throw new Error("Failed to refetch data");

//       const freshData = await refreshRes.json();

//       // 🧩 Update isi tabel tanpa reload halaman
//       setRows(freshData);
//     } catch (err) {
//       console.error("❌ Gagal update progress:", err);
//     }
//   };

//   const handleUpload = async (file: File) => {
//     if (!selectedRow) return;
//     console.log("📁 Uploading file for:", selectedRow.id);

//     try {
//       // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
//       const formData = new FormData();
//       formData.append("files", file);

//       const uploadRes = await fetch("/api/uploads/attachment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!uploadRes.ok) throw new Error("Upload gagal");

//       const uploaded = await uploadRes.json();
//       const fileUrl = uploaded?.url || uploaded?.[0]?.url;

//       console.log("✅ File uploaded:", fileUrl);

//       // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
//       const progressRes = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: selectedRow.id,
//           type: selectedRow.progress?.step?.name || type,
//           action: "Upload",
//           current_status: selectedRow.progress?.status?.name,
//           url: fileUrl, // 🆕 kirim URL hasil upload
//         }),
//       });

//       if (!progressRes.ok) throw new Error("Gagal update progress");
//       const updated = await progressRes.json();

//       console.log("🧾 Progress updated:", updated);

//       // --- 3️⃣ Re-fetch data untuk refresh tabel ---
//       const refetch = await fetch(`/api/${type.toLowerCase()}`);
//       const fresh = await refetch.json();
//       setRows(fresh);

//     } catch (err) {
//       console.error("❌ Gagal upload atau update progress:", err);
//     }

//     setUploadOpen(false);
//   };

//   return (
//     <>
//       <div className="overflow-x-auto rounded-xl border border-border">
//         <Table>
//           {caption && <TableCaption>{caption}</TableCaption>}

//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-[50px] text-center">No</TableHead>

//               {columns.map((col) => (
//                 <TableHead key={col.key}>{col.label}</TableHead>
//               ))}

//               {showStatus && <TableHead>Status</TableHead>}

//               <TableHead className="w-[60px]"></TableHead>
//             </TableRow>
//           </TableHeader>

//           <TableBody>
//             {rows.length > 0 ? (
//               rows.map((row, i) => (
//                 <TableRow key={i}>
//                   <TableCell className="text-center font-medium">
//                     {i + 1}
//                   </TableCell>

//                   {columns.map((col) => (
//                     <TableCell key={col.key}>
//                       {getValue(row, col.key) ?? "-"}
//                     </TableCell>
//                   ))}

//                   {showStatus && (
//                     <TableCell>
//                       <StatusTracker
//                         stepName={row.progress?.step?.name || type}
//                         currentStatus={row.progress?.status?.name || row.status?.name || "Draft"}
//                       />
//                     </TableCell>
//                   )}

//                   <TableCell className="text-right">
//                     <ActionTable
//                       row={row}
//                       type={type}
//                       onView={onView}
//                       onEdit={onEdit}
//                       onDelete={onDelete}
//                       onCustomAction={handleCustomAction}
//                       generatingId={generatingId} // <-- 3. KIRIM PROP KE ACTIONTABLE
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell
//                   colSpan={columns.length + (showStatus ? 3 : 2)}
//                   className="text-center py-6 text-muted-foreground"
//                 >
//                   No data available
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       <UploadModal
//           open={uploadOpen}
//           onClose={() => setUploadOpen(false)}
//           onSubmit={handleUpload}
//           title={`Upload Dokumen ${type.toUpperCase()}`}
//         />
//       </>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { StatusTracker } from "./status-tracker";
// import { ActionTable } from "./action-table";
// import { UploadModal } from "../input/upload-modal";

// interface DataTableProps {
//   caption?: string;
//   columns: { key: string; label: string }[];
//   data: Record<string, any>[]; // initial data
//   type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
// }

// export function DataTable({
//   caption,
//   columns,
//   data,
//   type = "default",
//   onView,
//   onEdit,
//   onDelete,
// }: DataTableProps) {
//   // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
//   const [rows, setRows] = useState<Record<string, any>[]>(data);
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [selectedRow, setSelectedRow] = useState<any>(null);

//   // kalau prop data berubah dari luar, update state juga
//   useEffect(() => {
//     setRows(data);
//   }, [data]);

//   // ambil nested value dari object
//   const getValue = (obj: any, path: string) =>
//     path.split(".").reduce((acc, part) => acc && acc[part], obj);

//   // tampilkan kolom status untuk tipe tertentu
//   const showStatus =
//     ["mom", "nda", "company", "msa", "mou", "jik"].includes(type.toLowerCase());

//   // 🔁 fungsi handle untuk aksi custom (Send / Approve / Upload / Sign)
//   const handleCustomAction = async (action: string, row: any) => {
//     if (action === "Upload") {
//       setSelectedRow(row);
//       setUploadOpen(true);
//       return; // stop di sini biar gak lanjut ke fetch progress
//     }

//     try {
//       const res = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: row.id,
//           type: row.progress?.step?.name || type,
//           action,
//           current_status: row.progress?.status?.name,
//         }),
//       });

//       if (!res.ok) throw new Error("Failed to update progress");

//       const updated = await res.json();
//       console.log("✅ Updated:", updated);

//       // 🔁 Re-fetch data tabel sesuai tipe dokumen
//       const refetchUrl = `/api/${type.toLowerCase()}`;
//       const refreshRes = await fetch(refetchUrl);

//       if (!refreshRes.ok) throw new Error("Failed to refetch data");

//       const freshData = await refreshRes.json();

//       // 🧩 Update isi tabel tanpa reload halaman
//       setRows(freshData);
//     } catch (err) {
//       console.error("❌ Gagal update progress:", err);
//     }
//   };

//   const handleUpload = async (file: File) => {
//     if (!selectedRow) return;
//     console.log("📁 Uploading file for:", selectedRow.id);

//     try {
//       // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
//       const formData = new FormData();
//       formData.append("files", file);

//       const uploadRes = await fetch("/api/uploads/attachment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!uploadRes.ok) throw new Error("Upload gagal");

//       const uploaded = await uploadRes.json();
//       const fileUrl = uploaded?.url || uploaded?.[0]?.url;

//       console.log("✅ File uploaded:", fileUrl);

//       // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
//       const progressRes = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: selectedRow.id,
//           type: selectedRow.progress?.step?.name || type,
//           action: "Upload",
//           current_status: selectedRow.progress?.status?.name,
//           url: fileUrl, // 🆕 kirim URL hasil upload
//         }),
//       });

//       if (!progressRes.ok) throw new Error("Gagal update progress");
//       const updated = await progressRes.json();

//       console.log("🧾 Progress updated:", updated);

//       // --- 3️⃣ Re-fetch data untuk refresh tabel ---
//       const refetch = await fetch(`/api/${type.toLowerCase()}`);
//       const fresh = await refetch.json();
//       setRows(fresh);

//     } catch (err) {
//       console.error("❌ Gagal upload atau update progress:", err);
//     }

//     setUploadOpen(false);
//   };

//   return (
//     <>
//       <div className="overflow-x-auto rounded-xl border border-border">
//         <Table>
//           {caption && <TableCaption>{caption}</TableCaption>}

//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-[50px] text-center">No</TableHead>

//               {columns.map((col) => (
//                 <TableHead key={col.key}>{col.label}</TableHead>
//               ))}

//               {showStatus && <TableHead>Status</TableHead>}

//               <TableHead className="w-[60px]"></TableHead>
//             </TableRow>
//           </TableHeader>

//           <TableBody>
//             {rows.length > 0 ? (
//               rows.map((row, i) => (
//                 <TableRow key={i}>
//                   <TableCell className="text-center font-medium">
//                     {i + 1}
//                   </TableCell>

//                   {columns.map((col) => (
//                     <TableCell key={col.key}>
//                       {getValue(row, col.key) ?? "-"}
//                     </TableCell>
//                   ))}

//                   {showStatus && (
//                     <TableCell>
//                       <StatusTracker
//                         stepName={row.progress?.step?.name || type}
//                         currentStatus={row.progress?.status?.name || row.status?.name || "Draft"}
//                       />
//                     </TableCell>
//                   )}

//                   <TableCell className="text-right">
//                     <ActionTable
//                       row={row}
//                       type={type}
//                       onView={onView}
//                       onEdit={onEdit}
//                       onDelete={onDelete}
//                       onCustomAction={handleCustomAction}
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell
//                   colSpan={columns.length + (showStatus ? 3 : 2)}
//                   className="text-center py-6 text-muted-foreground"
//                 >
//                   No data available
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       <UploadModal
//           open={uploadOpen}
//           onClose={() => setUploadOpen(false)}
//           onSubmit={handleUpload}
//           title={`Upload Dokumen ${type.toUpperCase()}`}
//         />
//       </>
//   );
// }
