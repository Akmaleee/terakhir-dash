export const revalidate = 0;

import { prisma } from "@/lib/prisma/postgres";
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
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Building,
  FileCheck,
  FileLock,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// =======================================================================
// HELPER: Color Configurations
// =======================================================================
const THEMES = {
  MOM: {
    iconBg: "bg-blue-100 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    border: "border-l-blue-500",
  },
  JIK: {
    iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-l-emerald-500",
  },
  NDA: {
    iconBg: "bg-rose-100 dark:bg-rose-900/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    border: "border-l-rose-500",
  },
  MOU: {
    iconBg: "bg-violet-100 dark:bg-violet-900/20",
    iconColor: "text-violet-600 dark:text-violet-400",
    border: "border-l-violet-500",
  },
  MSA: {
    iconBg: "bg-orange-100 dark:bg-orange-900/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    border: "border-l-orange-500",
  },
  MITRA: {
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400",
    border: "border-l-slate-500",
  },
  DEFAULT: {
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    border: "border-l-gray-500",
  },
};

type ThemeKey = keyof typeof THEMES;

// =======================================================================
// Komponen Kartu Statistik
// =======================================================================
interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  theme: ThemeKey;
}

const StatCard = ({ title, value, icon, theme }: StatCardProps) => {
  const styles = THEMES[theme] || THEMES.DEFAULT;

  return (
    <Card className="h-full border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group relative bg-card text-card-foreground">
      {/* Dekorasi Background Halus */}
      <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-10 -mr-4 -mt-4 rounded-full transition-transform group-hover:scale-150", styles.iconBg.replace("bg-", "bg-"))} />
      
      <CardContent className="p-5 flex items-center justify-between">
        {/* Kiri: Text & Value */}
        <div className="flex flex-col space-y-1 z-10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </span>
          </div>
        </div>

        {/* Kanan: Icon */}
        <div
          className={cn(
            "p-2.5 rounded-lg shrink-0 transition-colors duration-200 z-10",
            styles.iconBg,
            styles.iconColor
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};

// =======================================================================
// Komponen Kartu Aktivitas
// =======================================================================
interface ActivityItem {
  id: number;
  title: string;
  updated_at: Date;
  company: { name: string };
  progress: { status: { name: string } | null } | null;
  link: string;
  icon: ReactNode;
}

interface ActivityCardProps {
  title: string;
  items: ActivityItem[];
  emptyMessage: string;
  theme: ThemeKey;
}

const ActivityCard = ({ title, items, emptyMessage, theme }: ActivityCardProps) => {
  const styles = THEMES[theme] || THEMES.DEFAULT;

  return (
    <Card className="h-full border shadow-sm flex flex-col">
      <CardHeader className="pb-3 border-b bg-muted/10 px-5 py-4">
        <div className="flex items-center gap-2">
             {/* Dot indikator warna */}
             <div className={cn("w-2.5 h-2.5 rounded-full", styles.iconColor.replace("text-", "bg-"))} />
             <CardTitle className="text-sm font-semibold tracking-tight">
                {title}
             </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="divide-y">
          {items.map((item) => (
            <Link
              key={`${title}-${item.id}`}
              href={item.link}
              className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group relative"
            >
              <div className={cn("p-2 rounded-full shrink-0 bg-muted/50 text-muted-foreground group-hover:bg-white group-hover:shadow-sm transition-all", styles.iconColor)}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {item.company.name} • {format(new Date(item.updated_at), "dd MMM yyyy")}
                </p>
              </div>
              {/* Badge Status Sederhana */}
              <div className="shrink-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-secondary-foreground border border-secondary-foreground/10">
                  {item.progress?.status?.name || "Draft"}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center p-4 text-muted-foreground">
            <div className={cn("p-3 rounded-full mb-2 bg-muted/50")}>
              <MoreHorizontal className="h-5 w-5 opacity-50" />
            </div>
            <p className="text-xs">Belum ada data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =======================================================================
// Komponen Kartu Tabel Status
// =======================================================================
interface StatusTableCardProps {
  title: string;
  stats: Array<{ id?: string | number; name: string; count: number }>;
  theme: ThemeKey;
}

const StatusTableCard = ({ title, stats, theme }: StatusTableCardProps) => {
  const styles = THEMES[theme] || THEMES.DEFAULT;

  return (
    <Card className={cn("h-full shadow-sm border-l-[3px]", styles.border)}>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <Table>
          <TableBody>
            {stats.map((status) => (
              <TableRow key={status.name} className="hover:bg-transparent border-b-0">
                <TableCell className="py-1.5 pl-0 font-medium text-sm text-foreground/80">
                  {status.name}
                </TableCell>
                <TableCell className="py-1.5 pr-0 text-right">
                  <span className={cn(
                    "inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-xs font-bold shadow-sm",
                    status.count > 0 
                      ? `${styles.iconBg} ${styles.iconColor}`
                      : "bg-secondary text-muted-foreground"
                  )}>
                    {status.count}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {stats.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-4">
                  - Data Kosong -
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// =======================================================================
// Halaman Dashboard Utama
// =======================================================================
export default async function DashboardPage() {
  if (!prisma) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-red-500">Error: Koneksi database tidak tersedia.</p>
      </div>
    );
  }

  // 1. Fetch Data (Dengan filter deleted_at: null)
  const [momCount, jikCount, companyCount, statuses, allSteps] = await Promise.all([
    prisma.mom.count({ where: { deleted_at: null } }), // ✅ Filter deleted_at
    prisma.jik.count({ where: { deleted_at: null } }), // ✅ Filter deleted_at
    prisma.company.count(), // Company tidak ada deleted_at di schema
    prisma.status.findMany(),
    prisma.step.findMany(),
  ]);

  // Fetch data untuk perhitungan statistik status (Filtered)
  const moms = await prisma.mom.findMany({
    where: { deleted_at: null }, // ✅ Filter deleted_at
    select: { progress: { select: { status_id: true } } },
  });
  const jiks = await prisma.jik.findMany({
    where: { deleted_at: null }, // ✅ Filter deleted_at
    select: { progress: { select: { status_id: true } } },
  });

  // Helper Stats - Logic perhitungan tetap sama
  const momStatusCounts = statuses.map((status) => ({
    id: status.id,
    name: status.name,
    count: moms.filter((m) => m.progress?.status_id === status.id).length,
  }));
  const noStatusMoms = moms.filter((m) => !m.progress?.status_id).length;
  const allMomStatusStats = [{ id: 0, name: "Draft", count: noStatusMoms }, ...momStatusCounts];

  const jikStatusCounts = statuses.map((status) => ({
    id: status.id,
    name: status.name,
    count: jiks.filter((j) => j.progress?.status_id === status.id).length,
  }));
  const noStatusJiks = jiks.filter((j) => !j.progress?.status_id).length;
  const allJikStatusStats = [{ id: 0, name: "Draft", count: noStatusJiks }, ...jikStatusCounts];

  // Fetch Documents untuk NDA, MOU, MSA (Filtered)
  const documents = await prisma.document.findMany({
    where: { deleted_at: null }, // ✅ Filter deleted_at
    include: {
      progress: {
        include: {
          step: { select: { name: true } },
          status: { select: { name: true } },
          company: { select: { name: true } },
        },
      },
    },
  });

  // Logic Aggregation untuk Documents (stepCounts, dll)
  const stepCounts: Record<string, number> = {};
  const stepStatusCounts: Record<string, Record<string, number>> = {};
  const stepDraftCounts: Record<string, number> = {};

  allSteps.forEach((step) => {
    stepCounts[step.name] = 0;
    stepStatusCounts[step.name] = {};
    statuses.forEach((status) => {
      stepStatusCounts[step.name][status.name] = 0;
    });
    stepDraftCounts[step.name] = 0;
  });

  documents.forEach((doc) => {
    const stepName = doc.progress?.step?.name;
    const statusName = doc.progress?.status?.name;

    if (stepName) {
      if (stepCounts[stepName] !== undefined) stepCounts[stepName]++;
      
      if (statusName) {
        if(stepStatusCounts[stepName][statusName] !== undefined) stepStatusCounts[stepName][statusName]++;
      } else {
        if(stepDraftCounts[stepName] !== undefined) stepDraftCounts[stepName]++;
      }
    }
  });

  const createStatusArray = (stepName: string) => {
    if (!stepStatusCounts[stepName]) return [];
    const stats = statuses.map((status) => ({
      name: status.name,
      count: stepStatusCounts[stepName][status.name] || 0,
    }));
    stats.unshift({ name: "Draft", count: stepDraftCounts[stepName] || 0 });
    return stats;
  };

  const ndaStatusStats = createStatusArray("NDA");
  const mouStatusStats = createStatusArray("MOU");
  const msaStatusStats = createStatusArray("MSA");

  // Fetch Recent Activities (Filtered)
  const [recentMoms, recentJiks, recentNdas, recentMous, recentMsas] = await Promise.all([
    prisma.mom.findMany({
      where: { deleted_at: null }, // ✅ Filter deleted_at
      orderBy: { updated_at: "desc" },
      take: 5,
      include: { company: { select: { name: true } }, progress: { include: { status: { select: { name: true } } } } },
    }),
    prisma.jik.findMany({
      where: { deleted_at: null }, // ✅ Filter deleted_at
      orderBy: { updated_at: "desc" },
      take: 5,
      include: { company: { select: { name: true } }, progress: { include: { status: { select: { name: true } } } } },
    }),
    prisma.document.findMany({
      orderBy: { updated_at: "desc" }, 
      take: 5,
      include: { progress: { include: { status: true, company: true, step: true } } },
      where: { 
        progress: { step: { name: "NDA" } },
        deleted_at: null // ✅ Filter deleted_at
      },
    }),
    prisma.document.findMany({
      orderBy: { updated_at: "desc" }, 
      take: 5,
      include: { progress: { include: { status: true, company: true, step: true } } },
      where: { 
        progress: { step: { name: "MOU" } },
        deleted_at: null // ✅ Filter deleted_at
      },
    }),
    prisma.document.findMany({
      orderBy: { updated_at: "desc" }, 
      take: 5,
      include: { progress: { include: { status: true, company: true, step: true } } },
      where: { 
        progress: { step: { name: "MSA" } },
        deleted_at: null // ✅ Filter deleted_at
      },
    }),
  ]);

  // Format Data untuk UI
  const momItems: ActivityItem[] = recentMoms.map((mom) => ({
    id: mom.id,
    title: mom.title,
    updated_at: mom.updated_at,
    company: mom.company,
    progress: mom.progress,
    link: `/mom/view/${mom.id}`,
    icon: <FileText className="h-4 w-4" />,
  }));

  const jikItems: ActivityItem[] = recentJiks.map((jik) => ({
    id: jik.id,
    title: jik.judul,
    updated_at: jik.updated_at,
    company: jik.company,
    progress: jik.progress,
    link: `/jik-module/view/${jik.id}`,
    icon: <Briefcase className="h-4 w-4" />,
  }));

  const formatDocumentItem = (doc: any, stepName: string, link: string, icon: ReactNode): ActivityItem => ({
    id: doc.id,
    title: `${stepName} - ${doc.progress?.company?.name || 'Unknown'}`,
    updated_at: doc.updated_at,
    company: doc.progress?.company || { name: "Unknown" },
    progress: doc.progress ? { status: doc.progress.status } : null,
    link: link,
    icon: icon,
  });

  const ndaItems = recentNdas.map(doc => formatDocumentItem(doc, "NDA", "/nda", <FileLock className="h-4 w-4" />));
  const mouItems = recentMous.map(doc => formatDocumentItem(doc, "MOU", "/mou", <FileCheck className="h-4 w-4" />));
  const msaItems = recentMsas.map(doc => formatDocumentItem(doc, "MSA", "/msa", <FileSpreadsheet className="h-4 w-4" />));

  // =======================================================================
  // Render
  // =======================================================================
  return (
    <div className="flex-1 space-y-8 p-8 bg-muted/5 min-h-screen">
      {/* SECTION 1: STATISTIK UTAMA */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Minutes of Meeting" value={momCount} icon={<FileText className="h-5 w-5" />} theme="MOM" />
        <StatCard title="Justifikasi Inisiatif" value={jikCount} icon={<Briefcase className="h-5 w-5" />} theme="JIK" />
        <StatCard title="NDA Document" value={stepCounts["NDA"] || 0} icon={<FileLock className="h-5 w-5" />} theme="NDA" />
        <StatCard title="MOU Document" value={stepCounts["MOU"] || 0} icon={<FileCheck className="h-5 w-5" />} theme="MOU" />
        <StatCard title="MSA Document" value={stepCounts["MSA"] || 0} icon={<FileSpreadsheet className="h-5 w-5" />} theme="MSA" />
        <StatCard title="Total Mitra" value={companyCount} icon={<Building className="h-5 w-5" />} theme="MITRA" />
      </div>

      {/* SECTION 2: AKTIVITAS TERBARU */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        <div className="md:col-span-3 lg:col-span-3">
          <ActivityCard title="Aktivitas MoM Terbaru" items={momItems} emptyMessage="Tidak ada aktivitas MoM terbaru." theme="MOM" />
        </div>
        <div className="md:col-span-3 lg:col-span-3">
          <ActivityCard title="Aktivitas JIK Terbaru" items={jikItems} emptyMessage="Tidak ada aktivitas JIK terbaru." theme="JIK" />
        </div>

        <div className="md:col-span-3 lg:col-span-2">
          <ActivityCard title="Aktivitas NDA Terbaru" items={ndaItems} emptyMessage="Tidak ada aktivitas NDA." theme="NDA" />
        </div>
        <div className="md:col-span-3 lg:col-span-2">
          <ActivityCard title="Aktivitas MOU Terbaru" items={mouItems} emptyMessage="Tidak ada aktivitas MOU." theme="MOU" />
        </div>
        <div className="md:col-span-3 lg:col-span-2">
          <ActivityCard title="Aktivitas MSA Terbaru" items={msaItems} emptyMessage="Tidak ada aktivitas MSA." theme="MSA" />
        </div>
      </div>

      {/* SECTION 3: STATUS TRACKER */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        <div className="md:col-span-3 lg:col-span-3">
          <StatusTableCard title="Status MoM" stats={allMomStatusStats} theme="MOM" />
        </div>
        <div className="md:col-span-3 lg:col-span-3">
          <StatusTableCard title="Status JIK" stats={allJikStatusStats} theme="JIK" />
        </div>
        
        <div className="md:col-span-2">
          <StatusTableCard title="Status NDA" stats={ndaStatusStats} theme="NDA" />
        </div>
        <div className="md:col-span-2">
          <StatusTableCard title="Status MOU" stats={mouStatusStats} theme="MOU" />
        </div>
        <div className="md:col-span-2">
          <StatusTableCard title="Status MSA" stats={msaStatusStats} theme="MSA" />
        </div>
      </div>
    </div>
  );
}

// export const revalidate = 0;

// import { prisma } from "@/lib/prisma/postgres";
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
// import {
//   Briefcase,
//   Building,
//   FileCheck,
//   FileLock,
//   FileSpreadsheet,
//   FileText,
//   MoreHorizontal,
// } from "lucide-react";
// import { format } from "date-fns";
// import Link from "next/link";
// import { ReactNode } from "react";
// import { cn } from "@/lib/utils";

// // =======================================================================
// // HELPER: Color Configurations
// // =======================================================================
// const THEMES = {
//   MOM: {
//     iconBg: "bg-blue-100 dark:bg-blue-900/20",
//     iconColor: "text-blue-600 dark:text-blue-400",
//     border: "border-l-blue-500",
//   },
//   JIK: {
//     iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
//     iconColor: "text-emerald-600 dark:text-emerald-400",
//     border: "border-l-emerald-500",
//   },
//   NDA: {
//     iconBg: "bg-rose-100 dark:bg-rose-900/20",
//     iconColor: "text-rose-600 dark:text-rose-400",
//     border: "border-l-rose-500",
//   },
//   MOU: {
//     iconBg: "bg-violet-100 dark:bg-violet-900/20",
//     iconColor: "text-violet-600 dark:text-violet-400",
//     border: "border-l-violet-500",
//   },
//   MSA: {
//     iconBg: "bg-orange-100 dark:bg-orange-900/20",
//     iconColor: "text-orange-600 dark:text-orange-400",
//     border: "border-l-orange-500",
//   },
//   MITRA: {
//     iconBg: "bg-slate-100 dark:bg-slate-800",
//     iconColor: "text-slate-600 dark:text-slate-400",
//     border: "border-l-slate-500",
//   },
//   DEFAULT: {
//     iconBg: "bg-gray-100",
//     iconColor: "text-gray-600",
//     border: "border-l-gray-500",
//   },
// };

// type ThemeKey = keyof typeof THEMES;

// // =======================================================================
// // Komponen Kartu Statistik (DIPERBAIKI LAYOUTNYA)
// // =======================================================================
// interface StatCardProps {
//   title: string;
//   value: string | number;
//   icon: ReactNode;
//   theme: ThemeKey;
// }

// const StatCard = ({ title, value, icon, theme }: StatCardProps) => {
//   const styles = THEMES[theme] || THEMES.DEFAULT;

//   return (
//     <Card className="h-full border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group relative bg-card text-card-foreground">
//        {/* Dekorasi Background Halus */}
//       <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-10 -mr-4 -mt-4 rounded-full transition-transform group-hover:scale-150", styles.iconBg.replace("bg-", "bg-"))} />
      
//       <CardContent className="p-5 flex items-center justify-between">
//         {/* Kiri: Text & Value */}
//         <div className="flex flex-col space-y-1 z-10">
//           <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
//             {title}
//           </p>
//           <div className="flex items-baseline space-x-1">
//             <span className="text-2xl font-bold tracking-tight text-foreground">
//               {value}
//             </span>
//           </div>
//         </div>

//         {/* Kanan: Icon */}
//         <div
//           className={cn(
//             "p-2.5 rounded-lg shrink-0 transition-colors duration-200 z-10",
//             styles.iconBg,
//             styles.iconColor
//           )}
//         >
//           {icon}
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// // =======================================================================
// // Komponen Kartu Aktivitas (TETAP SAMA - SUDAH BAGUS)
// // =======================================================================
// interface ActivityItem {
//   id: number;
//   title: string;
//   updated_at: Date;
//   company: { name: string };
//   progress: { status: { name: string } | null } | null;
//   link: string;
//   icon: ReactNode;
// }

// interface ActivityCardProps {
//   title: string;
//   items: ActivityItem[];
//   emptyMessage: string;
//   theme: ThemeKey;
// }

// const ActivityCard = ({ title, items, emptyMessage, theme }: ActivityCardProps) => {
//   const styles = THEMES[theme] || THEMES.DEFAULT;

//   return (
//     <Card className="h-full border shadow-sm flex flex-col">
//       <CardHeader className="pb-3 border-b bg-muted/10 px-5 py-4">
//         <div className="flex items-center gap-2">
//              {/* Dot indikator warna */}
//              <div className={cn("w-2.5 h-2.5 rounded-full", styles.iconColor.replace("text-", "bg-"))} />
//              <CardTitle className="text-sm font-semibold tracking-tight">
//                 {title}
//              </CardTitle>
//         </div>
//       </CardHeader>
//       <CardContent className="p-0 flex-1">
//         <div className="divide-y">
//           {items.map((item) => (
//             <Link
//               key={`${title}-${item.id}`}
//               href={item.link}
//               className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group relative"
//             >
//               <div className={cn("p-2 rounded-full shrink-0 bg-muted/50 text-muted-foreground group-hover:bg-white group-hover:shadow-sm transition-all", styles.iconColor)}>
//                 {item.icon}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-sm font-medium leading-none truncate group-hover:text-primary transition-colors">
//                   {item.title}
//                 </p>
//                 <p className="text-xs text-muted-foreground mt-1 truncate">
//                   {item.company.name} • {format(new Date(item.updated_at), "dd MMM yyyy")}
//                 </p>
//               </div>
//               {/* Badge Status Sederhana */}
//               <div className="shrink-0">
//                 <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-secondary-foreground border border-secondary-foreground/10">
//                   {item.progress?.status?.name || "Draft"}
//                 </span>
//               </div>
//             </Link>
//           ))}
//         </div>
//         {items.length === 0 && (
//           <div className="flex flex-col items-center justify-center h-40 text-center p-4 text-muted-foreground">
//             <div className={cn("p-3 rounded-full mb-2 bg-muted/50")}>
//               <MoreHorizontal className="h-5 w-5 opacity-50" />
//             </div>
//             <p className="text-xs">Belum ada data</p>
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// };

// // =======================================================================
// // Komponen Kartu Tabel Status (TETAP SAMA - SUDAH BAGUS)
// // =======================================================================
// interface StatusTableCardProps {
//   title: string;
//   stats: Array<{ id?: string | number; name: string; count: number }>;
//   theme: ThemeKey;
// }

// const StatusTableCard = ({ title, stats, theme }: StatusTableCardProps) => {
//   const styles = THEMES[theme] || THEMES.DEFAULT;

//   return (
//     <Card className={cn("h-full shadow-sm border-l-[3px]", styles.border)}>
//       <CardHeader className="pb-2 pt-4 px-5">
//         <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
//           {title}
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="px-5 pb-4">
//         <Table>
//           <TableBody>
//             {stats.map((status) => (
//               <TableRow key={status.name} className="hover:bg-transparent border-b-0">
//                 <TableCell className="py-1.5 pl-0 font-medium text-sm text-foreground/80">
//                   {status.name}
//                 </TableCell>
//                 <TableCell className="py-1.5 pr-0 text-right">
//                   <span className={cn(
//                     "inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-xs font-bold shadow-sm",
//                     status.count > 0 
//                       ? `${styles.iconBg} ${styles.iconColor}`
//                       : "bg-secondary text-muted-foreground"
//                   )}>
//                     {status.count}
//                   </span>
//                 </TableCell>
//               </TableRow>
//             ))}
//             {stats.length === 0 && (
//               <TableRow>
//                 <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-4">
//                   - Data Kosong -
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </CardContent>
//     </Card>
//   );
// };

// // =======================================================================
// // Halaman Dashboard Utama
// // =======================================================================
// export default async function DashboardPage() {
//   if (!prisma) {
//     return (
//       <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//         <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
//         <p className="text-red-500">Error: Koneksi database tidak tersedia.</p>
//       </div>
//     );
//   }

//   // 1. Fetch Data 
//   const [momCount, jikCount, companyCount, statuses, allSteps] = await Promise.all([
//     prisma.mom.count(),
//     prisma.jik.count(),
//     prisma.company.count(),
//     prisma.status.findMany(),
//     prisma.step.findMany(),
//   ]);

//   const moms = await prisma.mom.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });
//   const jiks = await prisma.jik.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });

//   // Helper Stats
//   const momStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: moms.filter((m) => m.progress?.status_id === status.id).length,
//   }));
//   const noStatusMoms = moms.filter((m) => !m.progress?.status_id).length;
//   const allMomStatusStats = [{ id: 0, name: "Draft", count: noStatusMoms }, ...momStatusCounts];

//   const jikStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: jiks.filter((j) => j.progress?.status_id === status.id).length,
//   }));
//   const noStatusJiks = jiks.filter((j) => !j.progress?.status_id).length;
//   const allJikStatusStats = [{ id: 0, name: "Draft", count: noStatusJiks }, ...jikStatusCounts];

//   const documents = await prisma.document.findMany({
//     include: {
//       progress: {
//         include: {
//           step: { select: { name: true } },
//           status: { select: { name: true } },
//           company: { select: { name: true } },
//         },
//       },
//     },
//   });

//   const stepCounts: Record<string, number> = {};
//   const stepStatusCounts: Record<string, Record<string, number>> = {};
//   const stepDraftCounts: Record<string, number> = {};

//   allSteps.forEach((step) => {
//     stepCounts[step.name] = 0;
//     stepStatusCounts[step.name] = {};
//     statuses.forEach((status) => {
//       stepStatusCounts[step.name][status.name] = 0;
//     });
//     stepDraftCounts[step.name] = 0;
//   });

//   documents.forEach((doc) => {
//     const stepName = doc.progress?.step?.name;
//     const statusName = doc.progress?.status?.name;

//     if (stepName) {
//       if (stepCounts[stepName] !== undefined) stepCounts[stepName]++;
      
//       if (statusName) {
//         if(stepStatusCounts[stepName][statusName] !== undefined) stepStatusCounts[stepName][statusName]++;
//       } else {
//         if(stepDraftCounts[stepName] !== undefined) stepDraftCounts[stepName]++;
//       }
//     }
//   });

//   const createStatusArray = (stepName: string) => {
//     if (!stepStatusCounts[stepName]) return [];
//     const stats = statuses.map((status) => ({
//       name: status.name,
//       count: stepStatusCounts[stepName][status.name] || 0,
//     }));
//     stats.unshift({ name: "Draft", count: stepDraftCounts[stepName] || 0 });
//     return stats;
//   };

//   const ndaStatusStats = createStatusArray("NDA");
//   const mouStatusStats = createStatusArray("MOU");
//   const msaStatusStats = createStatusArray("MSA");

//   // Fetch Recent Activities
//   const [recentMoms, recentJiks, recentNdas, recentMous, recentMsas] = await Promise.all([
//     prisma.mom.findMany({
//       orderBy: { updated_at: "desc" },
//       take: 5,
//       include: { company: { select: { name: true } }, progress: { include: { status: { select: { name: true } } } } },
//     }),
//     prisma.jik.findMany({
//       orderBy: { updated_at: "desc" },
//       take: 5,
//       include: { company: { select: { name: true } }, progress: { include: { status: { select: { name: true } } } } },
//     }),
//     prisma.document.findMany({
//       orderBy: { updated_at: "desc" }, take: 5,
//       include: { progress: { include: { status: true, company: true, step: true } } },
//       where: { progress: { step: { name: "NDA" } } },
//     }),
//     prisma.document.findMany({
//       orderBy: { updated_at: "desc" }, take: 5,
//       include: { progress: { include: { status: true, company: true, step: true } } },
//       where: { progress: { step: { name: "MOU" } } },
//     }),
//     prisma.document.findMany({
//       orderBy: { updated_at: "desc" }, take: 5,
//       include: { progress: { include: { status: true, company: true, step: true } } },
//       where: { progress: { step: { name: "MSA" } } },
//     }),
//   ]);

//   // Format Data
//   const momItems: ActivityItem[] = recentMoms.map((mom) => ({
//     id: mom.id,
//     title: mom.title,
//     updated_at: mom.updated_at,
//     company: mom.company,
//     progress: mom.progress,
//     link: `/mom/view/${mom.id}`,
//     icon: <FileText className="h-4 w-4" />,
//   }));

//   const jikItems: ActivityItem[] = recentJiks.map((jik) => ({
//     id: jik.id,
//     title: jik.judul,
//     updated_at: jik.updated_at,
//     company: jik.company,
//     progress: jik.progress,
//     link: `/jik-module/view/${jik.id}`,
//     icon: <Briefcase className="h-4 w-4" />,
//   }));

//   const formatDocumentItem = (doc: any, stepName: string, link: string, icon: ReactNode): ActivityItem => ({
//     id: doc.id,
//     title: `${stepName} - ${doc.progress?.company?.name || 'Unknown'}`,
//     updated_at: doc.updated_at,
//     company: doc.progress?.company || { name: "Unknown" },
//     progress: doc.progress ? { status: doc.progress.status } : null,
//     link: link,
//     icon: icon,
//   });

//   const ndaItems = recentNdas.map(doc => formatDocumentItem(doc, "NDA", "/nda", <FileLock className="h-4 w-4" />));
//   const mouItems = recentMous.map(doc => formatDocumentItem(doc, "MOU", "/mou", <FileCheck className="h-4 w-4" />));
//   const msaItems = recentMsas.map(doc => formatDocumentItem(doc, "MSA", "/msa", <FileSpreadsheet className="h-4 w-4" />));

//   // =======================================================================
//   // Render
//   // =======================================================================
//   return (
//     <div className="flex-1 space-y-8 p-8 bg-muted/5 min-h-screen">


//       {/* SECTION 1: STATISTIK UTAMA - PERBAIKAN LAYOUT
//          - grid-cols-2 untuk mobile
//          - md:grid-cols-3 untuk tablet/laptop kecil
//          - xl:grid-cols-6 untuk layar besar (desktop)
//          Ini mencegah kartu menjadi terlalu gepeng.
//       */}
//       <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
//         <StatCard title="Minutes of Meeting" value={momCount} icon={<FileText className="h-5 w-5" />} theme="MOM" />
//         <StatCard title="Justifikasi Inisiatif" value={jikCount} icon={<Briefcase className="h-5 w-5" />} theme="JIK" />
//         <StatCard title="NDA Document" value={stepCounts["NDA"] || 0} icon={<FileLock className="h-5 w-5" />} theme="NDA" />
//         <StatCard title="MOU Document" value={stepCounts["MOU"] || 0} icon={<FileCheck className="h-5 w-5" />} theme="MOU" />
//         <StatCard title="MSA Document" value={stepCounts["MSA"] || 0} icon={<FileSpreadsheet className="h-5 w-5" />} theme="MSA" />
//         <StatCard title="Total Mitra" value={companyCount} icon={<Building className="h-5 w-5" />} theme="MITRA" />
//       </div>

//       {/* SECTION 2: AKTIVITAS TERBARU */}
//       <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
//         <div className="md:col-span-3 lg:col-span-3">
//           <ActivityCard title="Aktivitas MoM Terbaru" items={momItems} emptyMessage="Tidak ada aktivitas MoM terbaru." theme="MOM" />
//         </div>
//         <div className="md:col-span-3 lg:col-span-3">
//           <ActivityCard title="Aktivitas JIK Terbaru" items={jikItems} emptyMessage="Tidak ada aktivitas JIK terbaru." theme="JIK" />
//         </div>

//         <div className="md:col-span-3 lg:col-span-2">
//           <ActivityCard title="Aktivitas NDA Terbaru" items={ndaItems} emptyMessage="Tidak ada aktivitas NDA." theme="NDA" />
//         </div>
//         <div className="md:col-span-3 lg:col-span-2">
//           <ActivityCard title="Aktivitas MOU Terbaru" items={mouItems} emptyMessage="Tidak ada aktivitas MOU." theme="MOU" />
//         </div>
//         <div className="md:col-span-3 lg:col-span-2">
//           <ActivityCard title="Aktivitas MSA Terbaru" items={msaItems} emptyMessage="Tidak ada aktivitas MSA." theme="MSA" />
//         </div>
//       </div>

//       {/* SECTION 3: STATUS TRACKER */}
//       <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
//         <div className="md:col-span-3 lg:col-span-3">
//           <StatusTableCard title="Status MoM" stats={allMomStatusStats} theme="MOM" />
//         </div>
//         <div className="md:col-span-3 lg:col-span-3">
//           <StatusTableCard title="Status JIK" stats={allJikStatusStats} theme="JIK" />
//         </div>
        
//         <div className="md:col-span-2">
//           <StatusTableCard title="Status NDA" stats={ndaStatusStats} theme="NDA" />
//         </div>
//         <div className="md:col-span-2">
//           <StatusTableCard title="Status MOU" stats={mouStatusStats} theme="MOU" />
//         </div>
//         <div className="md:col-span-2">
//           <StatusTableCard title="Status MSA" stats={msaStatusStats} theme="MSA" />
//         </div>
//       </div>
//     </div>
//   );
// }
