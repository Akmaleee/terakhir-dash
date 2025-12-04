// src/app/jik-module/view/[id]/page.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { renderAsync } from "docx-preview";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// --- PERBAIKAN STYLE ---
const documentStyles = `
  /* Container utama: Berfungsi sebagai viewport scrollable */
  .docx-preview-container {
    background: #e5e7eb; /* Warna abu-abu seperti PDF viewer */
    padding: 2rem;
    width: 100%;
    height: calc(100vh - 100px); /* Tinggi otomatis mengisi layar */
    overflow: auto; /* PENTING: Scrollbar muncul jika dokumen lebar */
    border-radius: 8px;
    display: flex;
    justify-content: center; /* Dokumen di tengah jika layar lebar */
    align-items: flex-start;
  }

  /* Wrapper dokumen yang digenerate docx-preview */
  .docx-wrapper {
    background: transparent; 
    padding: 0;
    box-shadow: none;
    /* Pastikan wrapper tidak memaksa mengecil */
    min-width: fit-content; 
  }

  /* Style untuk setiap halaman kertas (section) */
  .docx-wrapper > section.docx { 
    background: white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
  }
`;

export default function JikViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const viewerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !viewerRef.current) return;

    // Tambahkan style ke head
    const styleElement = document.createElement("style");
    styleElement.innerHTML = documentStyles;
    document.head.appendChild(styleElement);

    const fetchAndRenderDoc = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Panggil API yang sama dengan 'Generate DOCX'
        const response = await fetch("/api/jik/generate-docx", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jikId: parseInt(id, 10) }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Gagal mengambil dokumen");
        }

        // 2. Ambil file sebagai Blob
        const docxBlob = await response.blob();

        // 3. Render blob ke dalam div target
        if (viewerRef.current) {
          const container = viewerRef.current;
          container.className = "docx-preview-container"; 

          // `renderAsync` akan me-render file di dalam elemen yang disediakan
          await renderAsync(
            docxBlob, // File blob
            container, // Elemen HTML target
            undefined, // HTMLElement | undefined
            {
              className: "docx-wrapper", 
              inWrapper: true, 
              ignoreWidth: false, // Tetap false agar layout tabel tidak rusak
              ignoreHeight: false,
              // Opsi tambahan untuk hasil render yang lebih baik
              breakPages: true,
              useBase64URL: true,
            }
          );
          console.log("Dokumen berhasil dirender.");
        }
      } catch (err: any) {
        console.error("Error rendering DOCX:", err);
        setError(err.message || "Terjadi kesalahan saat menampilkan file.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndRenderDoc();

    // Cleanup style saat komponen di-unmount
    return () => {
      if(document.head.contains(styleElement)) {
          document.head.removeChild(styleElement);
      }
    };
  }, [id]);

  return (
    <div className="p-6 h-screen flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <h1 className="text-xl font-semibold">Preview Dokumen JIK</h1>
      </div>

      {loading && (
        <Card className="flex-1 shadow-none border-dashed border-2 flex items-center justify-center bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
            <span className="text-lg text-muted-foreground">
              Memuat preview dokumen...
            </span>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mt-4 shadow-md bg-white rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-red-600">
            <AlertTriangle className="h-10 w-10" />
            <span className="text-lg font-semibold">Gagal Memuat File</span>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Div ini akan menjadi target untuk rendering DOCX */}
      {/* Kita sembunyikan container jika loading/error agar tidak ada kotak kosong */}
      <div 
        ref={viewerRef} 
        style={{ display: (loading || error) ? 'none' : 'flex' }}
      />
    </div>
  );
}
