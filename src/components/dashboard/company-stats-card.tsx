"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Tipe data untuk statistik status per dokumen
export type DocStats = Record<string, number>;

interface CompanyStats {
  id: number;
  name: string;
  mom: DocStats;
  jik: DocStats;
  nda: DocStats;
  mou: DocStats;
  msa: DocStats;
  totalActivity: number;
}

// Helper warna badge
const getBadgeStyle = (status: string) => {
  const s = status.toLowerCase();
  
  if (s.includes("finish") || s.includes("selesai") || s.includes("signed") || s.includes("aktif")) 
    return "bg-green-100 text-green-700 border-green-200";
  
  if (s.includes("review") || s.includes("legal") || s.includes("mitra")) 
    return "bg-blue-100 text-blue-700 border-blue-200";
  
  if (s.includes("sirkulir")) 
    return "bg-purple-100 text-purple-700 border-purple-200";
  
  if (s.includes("sign") || s.includes("tanda tangan")) 
    return "bg-amber-100 text-amber-700 border-amber-200";
  
  if (s.includes("draft") || s.includes("konsep")) 
    return "bg-slate-100 text-slate-600 border-slate-200";
  
  return "bg-gray-100 text-gray-700 border-gray-200";
};

// 🔥 HELPER BARU: Menentukan Prioritas Urutan Status (Lebih Detail)
// Semakin kecil angkanya, semakin di atas posisinya.
const getStatusPriority = (status: string) => {
  const s = status.toLowerCase();
  
  // 1. Tahap Awal
  if (s.includes("draft") || s.includes("konsep") || s.includes("new")) return 0;
  
  // 2. Tahap Review (SPESIFIK: Mitra dulu, baru Legal)
  if (s.includes("review") && s.includes("mitra")) return 1; // Prioritas 1
  if (s.includes("review") && (s.includes("legal") || s.includes("tsat"))) return 2; // Prioritas 2
  if (s.includes("review")) return 2.5; // Review lain-lain
  
  // 3. Tahap Sirkulir / Tanda Tangan
  if (s.includes("sirkulir")) return 3;
  if (s.includes("sign") || s.includes("tanda tangan")) return 3.5;
  
  // 4. Tahap Akhir
  if (s.includes("finish") || s.includes("selesai") || s.includes("signed") || s.includes("aktif")) return 4;
  
  // Default (jika ada status tak dikenal, taruh di paling bawah)
  return 5;
};

// Komponen Cell
const StatCell = ({ stats }: { stats: DocStats }) => {
  const entries = Object.entries(stats);

  if (entries.length === 0) {
    return <span className="text-muted-foreground/20 text-[10px]">-</span>;
  }

  // 🔥 UPDATE: Sort entries berdasarkan prioritas alur yang baru
  const sortedEntries = entries.sort(([statusA], [statusB]) => {
    const priorityA = getStatusPriority(statusA);
    const priorityB = getStatusPriority(statusB);
    
    // Jika prioritas beda, urutkan berdasarkan prioritas (0 -> 1 -> 2...)
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Jika prioritas sama, urutkan alfabetis
    return statusA.localeCompare(statusB);
  });

  return (
    <div className="flex flex-col gap-1.5 items-center justify-center py-2">
      {sortedEntries.map(([statusName, count]) => (
        <span 
          key={statusName} 
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border leading-tight text-center min-w-[80px] justify-center shadow-sm",
            getBadgeStyle(statusName)
          )}
        >
          {statusName}: {count}
        </span>
      ))}
    </div>
  );
};

export function CompanyStatsCard({ companies }: { companies: CompanyStats[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(companies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = companies.slice(startIndex, endIndex);

  const handlePrev = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

  return (
    <Card className="border shadow-sm flex flex-col h-full">
      <CardHeader className="pb-3 border-b bg-muted/10 px-5 py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <CardTitle className="text-sm font-semibold tracking-tight">
            Detail Status Dokumen per Mitra
          </CardTitle>
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          Page {currentPage} of {totalPages || 1}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col justify-between">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5 hover:bg-muted/5 border-b border-border/50">
                <TableHead className="w-[200px] pl-5 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">Mitra</TableHead>
                
                <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-rose-50/30 align-middle min-w-[120px]">NDA</TableHead>
                <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-violet-50/30 align-middle min-w-[120px]">MOU</TableHead>
                <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-orange-50/30 align-middle min-w-[120px]">MSA</TableHead>
                
                <TableHead className="w-[1px] p-0 bg-border/50"></TableHead>

                <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-blue-50/30 align-middle min-w-[100px]">MOM</TableHead>
                <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-emerald-50/30 align-middle min-w-[100px]">JIK</TableHead>
                
                <TableHead className="text-right pr-5 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((company) => (
                <TableRow key={company.id} className="hover:bg-muted/40 transition-colors border-b-0 group">
                  <TableCell className="pl-5 py-3 font-medium text-sm text-foreground/90 align-middle" title={company.name}>
                    <div className="line-clamp-2">{company.name}</div>
                  </TableCell>
                  
                  {/* Status Cells */}
                  <TableCell className="text-center py-1 bg-rose-50/5 group-hover:bg-rose-50/20 align-middle">
                    <StatCell stats={company.nda} />
                  </TableCell>
                  <TableCell className="text-center py-1 bg-violet-50/5 group-hover:bg-violet-50/20 align-middle">
                    <StatCell stats={company.mou} />
                  </TableCell>
                  <TableCell className="text-center py-1 bg-orange-50/5 group-hover:bg-orange-50/20 align-middle">
                    <StatCell stats={company.msa} />
                  </TableCell>

                  <TableCell className="p-0 bg-border/50"></TableCell>

                  <TableCell className="text-center py-1 align-middle">
                    <StatCell stats={company.mom} />
                  </TableCell>
                  <TableCell className="text-center py-1 align-middle">
                    <StatCell stats={company.jik} />
                  </TableCell>

                  <TableCell className="text-right pr-5 py-3 font-bold text-sm align-middle">
                    {company.totalActivity}
                  </TableCell>
                </TableRow>
              ))}
              
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
                    Belum ada data mitra
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-muted/5 mt-auto">
          <button onClick={handlePrev} disabled={currentPage === 1} className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 text-sm font-medium text-gray-600">Page <span className="text-primary font-bold">{currentPage}</span> of {totalPages || 1}</div>
          <button onClick={handleNext} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// "use client";

// import { useState } from "react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { cn } from "@/lib/utils";
// import { ChevronLeft, ChevronRight } from "lucide-react";

// // Tipe data untuk statistik status per dokumen
// export type DocStats = Record<string, number>;

// interface CompanyStats {
//   id: number;
//   name: string;
//   mom: DocStats;
//   jik: DocStats;
//   nda: DocStats;
//   mou: DocStats;
//   msa: DocStats;
//   totalActivity: number;
// }

// // Helper warna badge
// const getBadgeStyle = (status: string) => {
//   const s = status.toLowerCase();
  
//   if (s.includes("finish") || s.includes("selesai") || s.includes("signed") || s.includes("aktif")) 
//     return "bg-green-100 text-green-700 border-green-200";
  
//   if (s.includes("review") || s.includes("legal") || s.includes("mitra")) 
//     return "bg-blue-100 text-blue-700 border-blue-200";
  
//   if (s.includes("sirkulir")) 
//     return "bg-purple-100 text-purple-700 border-purple-200";
  
//   if (s.includes("sign") || s.includes("tanda tangan")) 
//     return "bg-amber-100 text-amber-700 border-amber-200";
  
//   if (s.includes("draft") || s.includes("konsep")) 
//     return "bg-slate-100 text-slate-600 border-slate-200";
  
//   return "bg-gray-100 text-gray-700 border-gray-200";
// };

// // 🔥 HELPER BARU: Menentukan Prioritas Urutan Status
// // 0 (Awal/Atas) -> 1 (Tengah) -> 2 (Akhir/Bawah)
// const getStatusPriority = (status: string) => {
//   const s = status.toLowerCase();
  
//   // Awal: Draft / Konsep
//   if (s.includes("draft") || s.includes("konsep") || s.includes("new")) return 0;
  
//   // Akhir: Finish / Selesai / Signed
//   if (s.includes("finish") || s.includes("selesai") || s.includes("signed") || s.includes("aktif")) return 2;
  
//   // Tengah: Review, Sirkulir, Signing, Process, dll
//   return 1;
// };

// // Komponen Cell
// const StatCell = ({ stats }: { stats: DocStats }) => {
//   const entries = Object.entries(stats);

//   if (entries.length === 0) {
//     return <span className="text-muted-foreground/20 text-[10px]">-</span>;
//   }

//   // 🔥 UPDATE: Sort entries berdasarkan prioritas alur
//   const sortedEntries = entries.sort(([statusA], [statusB]) => {
//     const priorityA = getStatusPriority(statusA);
//     const priorityB = getStatusPriority(statusB);
    
//     // Jika prioritas beda, urutkan berdasarkan prioritas (0 -> 1 -> 2)
//     if (priorityA !== priorityB) {
//       return priorityA - priorityB;
//     }
    
//     // Jika prioritas sama, urutkan alfabetis biar rapi
//     return statusA.localeCompare(statusB);
//   });

//   return (
//     <div className="flex flex-col gap-1.5 items-center justify-center py-2">
//       {sortedEntries.map(([statusName, count]) => (
//         <span 
//           key={statusName} 
//           className={cn(
//             "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border leading-tight text-center min-w-[80px] justify-center shadow-sm",
//             getBadgeStyle(statusName)
//           )}
//         >
//           {statusName}: {count}
//         </span>
//       ))}
//     </div>
//   );
// };

// export function CompanyStatsCard({ companies }: { companies: CompanyStats[] }) {
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 5;

//   const totalPages = Math.ceil(companies.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const endIndex = startIndex + itemsPerPage;
//   const currentData = companies.slice(startIndex, endIndex);

//   const handlePrev = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
//   const handleNext = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

//   return (
//     <Card className="border shadow-sm flex flex-col h-full">
//       <CardHeader className="pb-3 border-b bg-muted/10 px-5 py-4 flex flex-row items-center justify-between">
//         <div className="flex items-center gap-2">
//           <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
//           <CardTitle className="text-sm font-semibold tracking-tight">
//             Detail Status Dokumen per Mitra
//           </CardTitle>
//         </div>
//         <div className="text-xs text-muted-foreground font-medium">
//           Page {currentPage} of {totalPages || 1}
//         </div>
//       </CardHeader>
      
//       <CardContent className="p-0 flex-1 flex flex-col justify-between">
//         <div className="overflow-x-auto">
//           <Table>
//             <TableHeader>
//               <TableRow className="bg-muted/5 hover:bg-muted/5 border-b border-border/50">
//                 {/* Header tetap menggunakan align-middle agar rapi */}
//                 <TableHead className="w-[200px] pl-5 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">Mitra</TableHead>
                
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-rose-50/30 align-middle min-w-[120px]">NDA</TableHead>
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-violet-50/30 align-middle min-w-[120px]">MOU</TableHead>
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-orange-50/30 align-middle min-w-[120px]">MSA</TableHead>
                
//                 <TableHead className="w-[1px] p-0 bg-border/50"></TableHead>

//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-blue-50/30 align-middle min-w-[100px]">MOM</TableHead>
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-emerald-50/30 align-middle min-w-[100px]">JIK</TableHead>
                
//                 <TableHead className="text-right pr-5 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">Total</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {currentData.map((company) => (
//                 <TableRow key={company.id} className="hover:bg-muted/40 transition-colors border-b-0 group">
//                   <TableCell className="pl-5 py-3 font-medium text-sm text-foreground/90 align-middle" title={company.name}>
//                     <div className="line-clamp-2">{company.name}</div>
//                   </TableCell>
                  
//                   {/* Status Cells */}
//                   <TableCell className="text-center py-1 bg-rose-50/5 group-hover:bg-rose-50/20 align-top">
//                     <StatCell stats={company.nda} />
//                   </TableCell>
//                   <TableCell className="text-center py-1 bg-violet-50/5 group-hover:bg-violet-50/20 align-top">
//                     <StatCell stats={company.mou} />
//                   </TableCell>
//                   <TableCell className="text-center py-1 bg-orange-50/5 group-hover:bg-orange-50/20 align-top">
//                     <StatCell stats={company.msa} />
//                   </TableCell>

//                   <TableCell className="p-0 bg-border/50"></TableCell>

//                   <TableCell className="text-center py-1 align-top">
//                     <StatCell stats={company.mom} />
//                   </TableCell>
//                   <TableCell className="text-center py-1 align-top">
//                     <StatCell stats={company.jik} />
//                   </TableCell>

//                   <TableCell className="text-right pr-5 py-3 font-bold text-sm align-middle">
//                     {company.totalActivity}
//                   </TableCell>
//                 </TableRow>
//               ))}
              
//               {companies.length === 0 && (
//                 <TableRow>
//                   <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
//                     Belum ada data mitra
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </div>

//         <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-muted/5 mt-auto">
//           <button onClick={handlePrev} disabled={currentPage === 1} className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
//             <ChevronLeft className="h-4 w-4" />
//           </button>
//           <div className="flex items-center gap-1 text-sm font-medium text-gray-600">Page <span className="text-primary font-bold">{currentPage}</span> of {totalPages || 1}</div>
//           <button onClick={handleNext} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
//             <ChevronRight className="h-4 w-4" />
//           </button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// "use client";

// import { useState } from "react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { cn } from "@/lib/utils";
// import { ChevronLeft, ChevronRight } from "lucide-react";

// // Tipe data untuk statistik status per dokumen
// export type DocStats = Record<string, number>;

// interface CompanyStats {
//   id: number;
//   name: string;
//   mom: DocStats;
//   jik: DocStats;
//   nda: DocStats;
//   mou: DocStats;
//   msa: DocStats;
//   totalActivity: number;
// }

// // Helper warna badge
// const getBadgeStyle = (status: string) => {
//   const s = status.toLowerCase();
  
//   if (s.includes("finish") || s.includes("selesai") || s.includes("signed") || s.includes("aktif")) 
//     return "bg-green-100 text-green-700 border-green-200";
  
//   if (s.includes("review") || s.includes("legal") || s.includes("mitra")) 
//     return "bg-blue-100 text-blue-700 border-blue-200";
  
//   if (s.includes("sirkulir")) 
//     return "bg-purple-100 text-purple-700 border-purple-200";
  
//   if (s.includes("sign") || s.includes("tanda tangan")) 
//     return "bg-amber-100 text-amber-700 border-amber-200";
  
//   if (s.includes("draft") || s.includes("konsep")) 
//     return "bg-slate-100 text-slate-600 border-slate-200";
  
//   return "bg-gray-100 text-gray-700 border-gray-200";
// };

// // Komponen Cell
// const StatCell = ({ stats }: { stats: DocStats }) => {
//   const entries = Object.entries(stats);

//   if (entries.length === 0) {
//     return <span className="text-muted-foreground/20 text-[10px]">-</span>;
//   }

//   return (
//     <div className="flex flex-col gap-1.5 items-center justify-center py-2">
//       {entries.map(([statusName, count]) => (
//         <span 
//           key={statusName} 
//           className={cn(
//             "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border leading-tight text-center min-w-[80px] justify-center shadow-sm",
//             getBadgeStyle(statusName)
//           )}
//         >
//           {statusName}: {count}
//         </span>
//       ))}
//     </div>
//   );
// };

// export function CompanyStatsCard({ companies }: { companies: CompanyStats[] }) {
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 5;

//   const totalPages = Math.ceil(companies.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const endIndex = startIndex + itemsPerPage;
//   const currentData = companies.slice(startIndex, endIndex);

//   const handlePrev = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
//   const handleNext = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

//   return (
//     <Card className="border shadow-sm flex flex-col h-full">
//       <CardHeader className="pb-3 border-b bg-muted/10 px-5 py-4 flex flex-row items-center justify-between">
//         <div className="flex items-center gap-2">
//           <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
//           <CardTitle className="text-sm font-semibold tracking-tight">
//             Detail Status Dokumen per Mitra
//           </CardTitle>
//         </div>
//         <div className="text-xs text-muted-foreground font-medium">
//           Page {currentPage} of {totalPages || 1}
//         </div>
//       </CardHeader>
      
//       <CardContent className="p-0 flex-1 flex flex-col justify-between">
//         <div className="overflow-x-auto">
//           <Table>
//             <TableHeader>
//               <TableRow className="bg-muted/5 hover:bg-muted/5 border-b border-border/50">
//                 {/* 🔥 Header sekarang menggunakan align-middle untuk kerapian */}
//                 <TableHead className="w-[200px] pl-5 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">Mitra</TableHead>
                
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-rose-50/30 align-middle min-w-[120px]">NDA</TableHead>
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-violet-50/30 align-middle min-w-[120px]">MOU</TableHead>
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-orange-50/30 align-middle min-w-[120px]">MSA</TableHead>
                
//                 <TableHead className="w-[1px] p-0 bg-border/50"></TableHead>

//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-blue-50/30 align-middle min-w-[100px]">MOM</TableHead>
//                 <TableHead className="text-center h-12 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-emerald-50/30 align-middle min-w-[100px]">JIK</TableHead>
                
//                 <TableHead className="text-right pr-5 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">Total</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {currentData.map((company) => (
//                 <TableRow key={company.id} className="hover:bg-muted/40 transition-colors border-b-0 group">
//                   {/* 🔥 Kolom Mitra: align-middle */}
//                   <TableCell className="pl-5 py-3 font-medium text-sm text-foreground/90 align-middle" title={company.name}>
//                     <div className="line-clamp-2">{company.name}</div>
//                   </TableCell>
                  
//                   {/* Status Cells: align-middle agar badge berada di tengah vertikal */}
//                   <TableCell className="text-center py-1 bg-rose-50/5 group-hover:bg-rose-50/20 align-middle">
//                     <StatCell stats={company.nda} />
//                   </TableCell>
//                   <TableCell className="text-center py-1 bg-violet-50/5 group-hover:bg-violet-50/20 align-middle">
//                     <StatCell stats={company.mou} />
//                   </TableCell>
//                   <TableCell className="text-center py-1 bg-orange-50/5 group-hover:bg-orange-50/20 align-middle">
//                     <StatCell stats={company.msa} />
//                   </TableCell>

//                   <TableCell className="p-0 bg-border/50"></TableCell>

//                   <TableCell className="text-center py-1 align-middle">
//                     <StatCell stats={company.mom} />
//                   </TableCell>
//                   <TableCell className="text-center py-1 align-middle">
//                     <StatCell stats={company.jik} />
//                   </TableCell>

//                   {/* 🔥 Kolom Total: align-middle */}
//                   <TableCell className="text-right pr-5 py-3 font-bold text-sm align-middle">
//                     {company.totalActivity}
//                   </TableCell>
//                 </TableRow>
//               ))}
              
//               {companies.length === 0 && (
//                 <TableRow>
//                   <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
//                     Belum ada data mitra
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </div>

//         <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-muted/5 mt-auto">
//           <button onClick={handlePrev} disabled={currentPage === 1} className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
//             <ChevronLeft className="h-4 w-4" />
//           </button>
//           <div className="flex items-center gap-1 text-sm font-medium text-gray-600">Page <span className="text-primary font-bold">{currentPage}</span> of {totalPages || 1}</div>
//           <button onClick={handleNext} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
//             <ChevronRight className="h-4 w-4" />
//           </button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }