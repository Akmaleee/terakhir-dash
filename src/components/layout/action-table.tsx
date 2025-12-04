"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";

interface ActionTableProps {
  row: any;
  type: string;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (id: any) => void;
  onPrint?: (row: any) => void;
  onCustomAction?: (action: string, row: any) => void;
  generatingId?: number | null;
  deletingId?: number | null;
}

const STATUS_FLOW: Record<string, string[]> = {
  MOM: ["Review Mitra", "Signing Mitra", "Finish"],
  JIK: ["Sirkulir TSAT", "Finish"],
  NDA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
  MOU: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
  MSA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
};

function getDynamicActions(type: string, status: string): string[] {
  const upperType = type?.toUpperCase();
  const flow = STATUS_FLOW[upperType];
  if (!flow) return [];

  const normalizedStatus = status?.trim().toUpperCase();
  const isAgreement = ["NDA", "MOU", "MSA"].includes(upperType);

  if (isAgreement) {
    switch (normalizedStatus) {
      case "SIRKULIR TSAT": return ["Upload Sirkulir"];
      case "SIGNING MITRA": return ["Upload Signed"];
      case "REVIEW MITRA":
      case "REVIEW LEGAL TSAT": return ["Approve"];
      default: return [];
    }
  }

  switch (normalizedStatus) {
    case "REVIEW MITRA":
    case "REVIEW LEGAL TSAT": return ["Approve"];
    case "SIRKULIR TSAT": return ["Upload"];
    case "SIGNING MITRA": return ["Sign"];
    case "DRAFT": return ["Send"];
    default: return [];
  }
}

export function ActionTable({
  row,
  type,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onCustomAction,
  generatingId,
  deletingId,
}: ActionTableProps) {
  const currentStatus = row?.progress?.status?.name || row?.status?.name || "Draft";
  const dynamicActions = getDynamicActions(type, currentStatus);
  const isDraft = currentStatus?.trim().toLowerCase() === "draft";

  const isGenerating = generatingId === row.id;
  const isDeleting = deletingId === row.id;
  const showDocxButton = type.toLowerCase() === "jik" || type.toLowerCase() === "mom";

  // --- PERBAIKAN LOGIKA HIDE/SHOW ---
  
  // 1. Hide View: Hanya untuk 'approver' dan 'company'
  const hideView = ["approver", "company"].includes(type.toLowerCase());

  // 2. Hide Edit: Untuk 'nda', 'mou', 'msa', 'company'
  // (Approver tidak ada di sini, jadi Edit akan muncul)
  const hideEdit = ["nda", "mou", "msa", "company"].includes(type.toLowerCase());

  const hasApproved = row?.mom_approvers?.some((a: any) => a.is_approved === true);
  const showDocxSigned =
    (type.toLowerCase() === "mom" &&
    currentStatus.trim().toLowerCase() === "signing mitra") ||
    (currentStatus.trim().toLowerCase() === "finish" && hasApproved);

  const showDownload =
    (type === "jik" && currentStatus.trim().toLowerCase() === "finish") ||
    (["msa", "mou", "nda"].some(keyword => type.includes(keyword)) && !isDraft);

  const displayActions =
    type.toLowerCase() === "mom"
      ? dynamicActions.map(a => (a === "Sign" ? "Check" : a))
      : dynamicActions;

  const handleAction = (action: string, fallback: ((row: any) => void) | undefined) => {
    if (onCustomAction) {
      const actualAction =
        type.toLowerCase() === "mom" && action === "Check" ? "Check" : action;

      if (fallback) fallback(row);
      if (onCustomAction) {
        onCustomAction(actualAction, row);
        return;
      }
    } else {
      fallback?.(row);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        
        {/* Tombol View */}
        {!hideView && (
          <DropdownMenuItem onClick={() => handleAction("View", onView)}>View</DropdownMenuItem>
        )}

        {/* Tombol Edit */}
        {!hideEdit && (
          <DropdownMenuItem onClick={() => handleAction("Edit", onEdit)}>Edit</DropdownMenuItem>
        )}

        {showDownload && (
          <DropdownMenuItem onClick={() => handleAction("Print", onPrint)}>Download</DropdownMenuItem>
        )}

        {showDocxButton && (
          <>
            <DropdownMenuItem
              onClick={() => handleAction("Generate DOCX", undefined)}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isGenerating ? "Generating..." : "Generate DOCX"}
            </DropdownMenuItem>

            {showDocxSigned && (
              <DropdownMenuItem
                onClick={() => handleAction("Generate DOCX Signed", undefined)}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isGenerating ? "Generating..." : "Generate DOCX Signed"}
              </DropdownMenuItem>
            )}
          </>
        )}

        {displayActions.length > 0 && <DropdownMenuSeparator />}
        {displayActions.map((action) => (
          <DropdownMenuItem key={action} onClick={() => handleAction(action, undefined)}>
            {action}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => {
            if (onDelete) onDelete(row.id);
            else if (onCustomAction) onCustomAction("Delete", row);
          }}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
        
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal, Loader2 } from "lucide-react";

// interface ActionTableProps {
//   row: any;
//   type: string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (id: any) => void;
//   onPrint?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void;
//   generatingId?: number | null;
//   deletingId?: number | null;
// }

// const STATUS_FLOW: Record<string, string[]> = {
//   MOM: ["Review Mitra", "Signing Mitra", "Finish"],
//   JIK: ["Sirkulir TSAT", "Finish"],
//   NDA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
//   MOU: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
//   MSA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
// };

// function getDynamicActions(type: string, status: string): string[] {
//   const upperType = type?.toUpperCase();
//   const flow = STATUS_FLOW[upperType];
//   if (!flow) return [];

//   const normalizedStatus = status?.trim().toUpperCase();

//   const isAgreement = ["NDA", "MOU", "MSA"].includes(upperType);

//   if (isAgreement) {
//     switch (normalizedStatus) {
//       case "SIRKULIR TSAT":
//         return ["Upload Sirkulir"];
//       case "SIGNING MITRA":
//         return ["Upload Signed"];
//       case "REVIEW MITRA":
//       case "REVIEW LEGAL TSAT":
//         return ["Approve"];
//       default:
//         return [];
//     }
//   }

//   switch (normalizedStatus) {
//     case "REVIEW MITRA":
//     case "REVIEW LEGAL TSAT":
//       return ["Approve"];
//     case "SIRKULIR TSAT":
//       return ["Upload"];
//     case "SIGNING MITRA":
//       return ["Sign"];
//     case "DRAFT":
//       return ["Send"];
//     default:
//       return [];
//   }
// }

// export function ActionTable({
//   row,
//   type,
//   onView,
//   onEdit,
//   onDelete,
//   onPrint,
//   onCustomAction,
//   generatingId,
//   deletingId,
// }: ActionTableProps) {
//   const currentStatus = row?.progress?.status?.name || row?.status?.name || "Draft";
//   const dynamicActions = getDynamicActions(type, currentStatus);
//   const isDraft = currentStatus?.trim().toLowerCase() === "draft";

//   const isGenerating = generatingId === row.id;
//   const isDeleting = deletingId === row.id;
//   const showDocxButton = type.toLowerCase() === "jik" || type.toLowerCase() === "mom";

//   const hideViewEdit = ["nda", "mou", "msa","company"].includes(type.toLowerCase());

//   const hasApproved = row?.mom_approvers?.some((a: any) => a.is_approved === true);
//   const showDocxSigned =
//     type.toLowerCase() === "mom" &&
//     currentStatus.trim().toLowerCase() === "signing mitra" ||
//     currentStatus.trim().toLowerCase() === "finish" &&
//     hasApproved;

//   const showDownload =
//     (type === "jik" && currentStatus.trim().toLowerCase() === "finish") ||
//     (["msa", "mou", "nda"].some(keyword => type.includes(keyword)) && 
//     !isDraft);

//   const displayActions =
//     type.toLowerCase() === "mom"
//       ? dynamicActions.map(a => (a === "Sign" ? "Check" : a))
//       : dynamicActions;

//   const handleAction = (action: string, fallback: ((row: any) => void) | undefined) => {
//     if (onCustomAction) {
//       const actualAction =
//         type.toLowerCase() === "mom" && action === "Check" ? "Check" : action;

//       if (fallback) {
//         fallback(row);
//       }

//       if (onCustomAction) {
//         onCustomAction(actualAction, row);
//         return;
//       }
//     } else {
//       fallback?.(row);
//     }
//   };

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="h-8 w-8 p-0">
//           <MoreHorizontal className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent align="end">
//         {!hideViewEdit && (
//           <DropdownMenuItem onClick={() => handleAction("View", onView)}>View</DropdownMenuItem>
//         )}
//         {!hideViewEdit && (
//           <DropdownMenuItem onClick={() => handleAction("Edit", onEdit)}>Edit</DropdownMenuItem>
//         )}

//         {showDownload && (          
//           <DropdownMenuItem onClick={() => handleAction("Print", onPrint)}>Download</DropdownMenuItem>
//         )}

//         {showDocxButton && (
//           <>
//             <DropdownMenuItem
//               onClick={() => handleAction("Generate DOCX", undefined)}
//               disabled={isGenerating}
//             >
//               {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//               {isGenerating ? "Generating..." : "Generate DOCX"}
//             </DropdownMenuItem>

//             {showDocxSigned &&(
//               <>
//                 <DropdownMenuItem
//                   onClick={() => handleAction("Generate DOCX Signed", undefined)}
//                   disabled={isGenerating}
//                 >
//                   {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//                   {isGenerating ? "Generating..." : "Generate DOCX Signed"}
//                 </DropdownMenuItem>
//               </>
//             )}
//           </>
//         )}

//         {displayActions.length > 0 && <DropdownMenuSeparator />}
//         {displayActions.map((action) => (
//           <DropdownMenuItem key={action} onClick={() => handleAction(action, undefined)}>
//             {action}
//           </DropdownMenuItem>
//         ))}

//         <DropdownMenuSeparator />
        
//         {/* 🔥 PERBAIKAN UTAMA DI SINI */}
//         <DropdownMenuItem
//           className="text-red-600 focus:text-red-600"
//           onClick={() => {
//             // Prioritas 1: Jika onDelete (prop langsung) ada, pakai itu (biasanya untuk NDA/MOU/MSA)
//             if (onDelete) {
//                 onDelete(row.id);
//             } 
//             // Prioritas 2: Jika onDelete tidak ada, panggil onCustomAction "Delete" (untuk JIK/MOM)
//             else if (onCustomAction) {
//                 onCustomAction("Delete", row);
//             }
//           }}
//           disabled={isDeleting}
//         >
//           {isDeleting ? "Deleting..." : "Delete"}
//         </DropdownMenuItem>
        
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal, Loader2 } from "lucide-react";

// interface ActionTableProps {
//   row: any;
//   type: string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (id: any) => void; // Update tipe parameter jadi id (any/number)
//   onPrint?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void;
//   generatingId?: number | null;
//   deletingId?: number | null;
// }

// const STATUS_FLOW: Record<string, string[]> = {
//   MOM: ["Review Mitra", "Signing Mitra", "Finish"],
//   JIK: ["Sirkulir TSAT", "Finish"],
//   NDA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
//   MOU: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
//   MSA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
// };

// function getDynamicActions(type: string, status: string): string[] {
//   const upperType = type?.toUpperCase();
//   const flow = STATUS_FLOW[upperType];
//   if (!flow) return [];

//   const normalizedStatus = status?.trim().toUpperCase();

//   const isAgreement = ["NDA", "MOU", "MSA"].includes(upperType);

//   if (isAgreement) {
//     switch (normalizedStatus) {
//       case "SIRKULIR TSAT":
//         return ["Upload Sirkulir"];
//       case "SIGNING MITRA":
//         return ["Upload Signed"];
//       case "REVIEW MITRA":
//       case "REVIEW LEGAL TSAT":
//         return ["Approve"];
//       default:
//         return [];
//     }
//   }

//   switch (normalizedStatus) {
//     case "REVIEW MITRA":
//     case "REVIEW LEGAL TSAT":
//       return ["Approve"];
//     case "SIRKULIR TSAT":
//       return ["Upload"];
//     case "SIGNING MITRA":
//       return ["Sign"];
//     case "DRAFT":
//       return ["Send"];
//     default:
//       return [];
//   }
// }

// export function ActionTable({
//   row,
//   type,
//   onView,
//   onEdit,
//   onDelete,
//   onPrint,
//   onCustomAction,
//   generatingId,
//   deletingId,
// }: ActionTableProps) {
//   const currentStatus = row?.progress?.status?.name || row?.status?.name || "Draft";
//   const dynamicActions = getDynamicActions(type, currentStatus);
//   const isDraft = currentStatus?.trim().toLowerCase() === "draft";

//   const isGenerating = generatingId === row.id;
//   const isDeleting = deletingId === row.id;
//   const showDocxButton = type.toLowerCase() === "jik" || type.toLowerCase() === "mom";

//   // hide view & edit 
//   const hideViewEdit = ["nda", "mou", "msa"].includes(type.toLowerCase());

//   // Show generate signed docx
//   const hasApproved = row?.mom_approvers?.some((a: any) => a.is_approved === true);
//   const showDocxSigned =
//     type.toLowerCase() === "mom" &&
//     currentStatus.trim().toLowerCase() === "signing mitra" ||
//     currentStatus.trim().toLowerCase() === "finish" &&
//     hasApproved;

//   // show download button
//   const showDownload =
//     (type === "jik" && currentStatus.trim().toLowerCase() === "finish") ||
//     (["msa", "mou", "nda"].some(keyword => type.includes(keyword)) && 
//     !isDraft);

//   // check if mom & status signing mitra
//   const displayActions =
//     type.toLowerCase() === "mom"
//       ? dynamicActions.map(a => (a === "Sign" ? "Check" : a))
//       : dynamicActions;

//   const handleAction = (action: string, fallback: ((row: any) => void) | undefined) => {
//     if (onCustomAction) {
//       const actualAction =
//         type.toLowerCase() === "mom" && action === "Check" ? "Check" : action;

//       if (fallback) {
//         fallback(row);
//       }

//       if (onCustomAction) {
//         onCustomAction(actualAction, row);
//         return;
//       }
//     } else {
//       fallback?.(row);
//     }
//   };

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="h-8 w-8 p-0">
//           <MoreHorizontal className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent align="end">
//         {!hideViewEdit && (
//           <DropdownMenuItem onClick={() => handleAction("View", onView)}>View</DropdownMenuItem>
//         )}
//         {!hideViewEdit && (
//           <DropdownMenuItem onClick={() => handleAction("Edit", onEdit)}>Edit</DropdownMenuItem>
//         )}

//         {showDownload && (          
//           <DropdownMenuItem onClick={() => handleAction("Print", onPrint)}>Download</DropdownMenuItem>
//         )}

//         {/* --- MENU GENERATE DOCX (NORMAL & SIGNED) --- */}
//         {showDocxButton && (
//           <>
//             <DropdownMenuItem
//               onClick={() => handleAction("Generate DOCX", undefined)}
//               disabled={isGenerating}
//             >
//               {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//               {isGenerating ? "Generating..." : "Generate DOCX"}
//             </DropdownMenuItem>

//             {showDocxSigned &&(
//               <>
//                 <DropdownMenuItem
//                   onClick={() => handleAction("Generate DOCX Signed", undefined)}
//                   disabled={isGenerating}
//                 >
//                   {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//                   {isGenerating ? "Generating..." : "Generate DOCX Signed"}
//                 </DropdownMenuItem>
//               </>
//             )}
//           </>
//         )}

//         {displayActions.length > 0 && <DropdownMenuSeparator />}
//         {displayActions.map((action) => (
//           <DropdownMenuItem key={action} onClick={() => handleAction(action, undefined)}>
//             {action}
//           </DropdownMenuItem>
//         ))}

//         <DropdownMenuSeparator />
        
//         {/* 🔥 PERBAIKAN DI SINI: Panggil onDelete dengan row.id, bukan lewat handleAction */}
//         <DropdownMenuItem
//           className="text-red-600 focus:text-red-600"
//           onClick={() => {
//             if (onDelete) onDelete(row.id);
//           }}
//           disabled={isDeleting}
//         >
//           {isDeleting ? "Deleting..." : "Delete"}
//         </DropdownMenuItem>
        
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal, Loader2 } from "lucide-react";
// import { normalize } from "path";

// interface ActionTableProps {
//   row: any;
//   type: string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onPrint?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void;
//   generatingId?: number | null;
//   deletingId?: number | null;
// }

// const STATUS_FLOW: Record<string, string[]> = {
//   MOM: ["Review Mitra", "Signing Mitra", "Finish"],
//   JIK: ["Sirkulir TSAT", "Finish"],
//   NDA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
//   MOU: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
//   MSA: ["Review Mitra", "Review Legal TSAT", "Sirkulir TSAT", "Signing Mitra", "Finish"],
// };

// function getDynamicActions(type: string, status: string): string[] {
//   const upperType = type?.toUpperCase();
//   const flow = STATUS_FLOW[upperType];
//   if (!flow) return [];

//   const normalizedStatus = status?.trim().toUpperCase();

//   const isAgreement = ["NDA", "MOU", "MSA"].includes(upperType);

//   if (isAgreement) {
//     switch (normalizedStatus) {
//       case "SIRKULIR TSAT":
//         return ["Upload Sirkulir"];
//       case "SIGNING MITRA":
//         return ["Upload Signed"];
//       case "REVIEW MITRA":
//       case "REVIEW LEGAL TSAT":
//         return ["Approve"];
//       default:
//         return [];
//     }
//   }

//   switch (normalizedStatus) {
//     case "REVIEW MITRA":
//     case "REVIEW LEGAL TSAT":
//       return ["Approve"];
//     case "SIRKULIR TSAT":
//       return ["Upload"];
//     case "SIGNING MITRA":
//       return ["Sign"];
//     case "DRAFT":
//       return ["Send"];
//     default:
//       return [];
//   }
// }

// export function ActionTable({
//   row,
//   type,
//   onView,
//   onEdit,
//   onDelete,
//   onPrint,
//   onCustomAction,
//   generatingId,
//   deletingId,
// }: ActionTableProps) {
//   const currentStatus = row?.progress?.status?.name || row?.status?.name || "Draft";
//   const dynamicActions = getDynamicActions(type, currentStatus);
//   const isDraft = currentStatus?.trim().toLowerCase() === "draft";

//   const isGenerating = generatingId === row.id;
//   const isDeleting = deletingId === row.id;
//   const showDocxButton = type.toLowerCase() === "jik" || type.toLowerCase() === "mom";

//   // hide view & edit 
//   const hideViewEdit = ["nda", "mou", "msa"].includes(type.toLowerCase());

//   // Show generate signed docx
//   const hasApproved = row?.mom_approvers?.some(a => a.is_approved === true);
//   const showDocxSigned =
//     type.toLowerCase() === "mom" &&
//     currentStatus.trim().toLowerCase() === "signing mitra" ||
//     currentStatus.trim().toLowerCase() === "finish" &&
//     hasApproved;

//   // show download button
//   const showDownload =
//     (type === "jik" && currentStatus.trim().toLowerCase() === "finish") ||
//     ["msa", "mou", "nda"].some(keyword => type.includes(keyword)) && 
//     !isDraft;

//   // check if mom & status signing mitra
//   const displayActions =
//     type.toLowerCase() === "mom"
//       ? dynamicActions.map(a => (a === "Sign" ? "Check" : a))
//       : dynamicActions;

//   const handleAction = (action: string, fallback: ((row: any) => void) | undefined) => {
//     if (onCustomAction) {
//       const actualAction =
//         type.toLowerCase() === "mom" && action === "Check" ? "Check" : action;

//       if (fallback) {
//         fallback(row);
//       }

//       if (onCustomAction) {
//         onCustomAction(actualAction, row);
//         return;
//       }
//     } else {
//       fallback?.(row);
//     }
//   };

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="h-8 w-8 p-0">
//           <MoreHorizontal className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent align="end">
//         {!hideViewEdit && (
//           <DropdownMenuItem onClick={() => handleAction("View", onView)}>View</DropdownMenuItem>
//         )}
//         {!hideViewEdit && (
//           <DropdownMenuItem onClick={() => handleAction("Edit", onEdit)}>Edit</DropdownMenuItem>
//         )}

//         {showDownload && (          
//           <DropdownMenuItem onClick={() => handleAction("Print", onPrint)}>Download</DropdownMenuItem>
//         )}

//         {/* --- MENU GENERATE DOCX (NORMAL & SIGNED) --- */}
//         {showDocxButton && (
//           <>
//             <DropdownMenuItem
//               onClick={() => handleAction("Generate DOCX", undefined)}
//               disabled={isGenerating}
//             >
//               {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//               {isGenerating ? "Generating..." : "Generate DOCX"}
//             </DropdownMenuItem>

//             {showDocxSigned &&(
//               <>
//                 <DropdownMenuItem
//                   onClick={() => handleAction("Generate DOCX Signed", undefined)}
//                   disabled={isGenerating}
//                 >
//                   {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//                   {isGenerating ? "Generating..." : "Generate DOCX Signed"}
//                 </DropdownMenuItem>
//               </>
//             )}
//           </>
//         )}

//         {displayActions.length > 0 && <DropdownMenuSeparator />}
//         {displayActions.map((action) => (
//           <DropdownMenuItem key={action} onClick={() => handleAction(action, undefined)}>
//             {action}
//           </DropdownMenuItem>
//         ))}

//         <DropdownMenuSeparator />
//         <DropdownMenuItem
//           className="text-red-600 focus:text-red-600"
//           onClick={() => handleAction("Delete", onDelete)}
//           disabled={isDeleting}
//         >
//           {isDeleting ? "Deleting..." : "Delete"}
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }



// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal } from "lucide-react";

// interface ActionTableProps {
//   row: any;
//   type: string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onPrint?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void;
//   generatingId?: number | null;
//   deletingId?: number | null;
// }

// const STATUS_FLOW: Record<string, string[]> = {
//   MOM: ["Review Mitra", "Signing Mitra", "Finish"],
//   JIK: ["Sirkulir TSAT", "Finish"],
//   NDA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MOU: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MSA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
// };

// // 🔧 Helper untuk aksi dinamis (case-insensitive)
// function getDynamicActions(type: string, status: string): string[] {
//   const upperType = type?.toUpperCase();
//   const flow = STATUS_FLOW[upperType];
//   if (!flow) return [];

//   const normalizedStatus = status?.trim().toUpperCase();

//   switch (normalizedStatus) {
//     case "REVIEW MITRA":
//     case "REVIEW LEGAL TSAT":
//       return ["Approve"];
//     case "SIRKULIR TSAT":
//       return ["Upload"];
//     case "SIGNING MITRA":
//       return ["Sign"];
//     case "DRAFT":
//       return ["Send"];
//     default:
//       return [];
//   }
// }

// export function ActionTable({
//   row,
//   type,
//   onView, 
//   onEdit, 
//   onDelete, 
//   onPrint,
//   onCustomAction,
//   generatingId,
//   deletingId, 
// }: ActionTableProps) {
//   const currentStatus = row?.progress?.status?.name || "Draft";
//   const dynamicActions = getDynamicActions(type, currentStatus);
//   const isDraft = currentStatus?.trim().toLowerCase() === "draft";

//   const isGenerating = generatingId === row.id;
//   const isDeleting = deletingId === row.id; 
//   const showDocxButton =
//     type.toLowerCase() === "jik" || type.toLowerCase() === "mom";
  
//   const handleAction = (action: string, fallback: ((row: any) => void) | undefined) => {
//     if (onCustomAction) {
//       onCustomAction(action, row);
//     } else {
//       fallback?.(row);
//     }
//   };


//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="h-8 w-8 p-0">
//           <MoreHorizontal className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent align="end">
//         {/* Aksi 'View' (opsional) */}
//         <DropdownMenuItem onClick={() => handleAction("View", onView)}>
//           View
//         </DropdownMenuItem>

//         {/* Aksi 'Edit' */}
//         <DropdownMenuItem onClick={() => handleAction("Edit", onEdit)}>
//           Edit
//         </DropdownMenuItem>

//         {/* 🖨️ Tombol Print — hanya muncul jika status ≠ Draft */}
//         {!isDraft && (
//           <DropdownMenuItem onClick={() => handleAction("Print", onPrint)}>
//             Print
//           </DropdownMenuItem>
//         )}

//         {/* 📄 Tombol Generate DOCX — hanya untuk JIK/MOM */}
//         {showDocxButton && (
//           <DropdownMenuItem
//             onClick={() => handleAction("Generate DOCX", undefined)}
//             disabled={isGenerating}
//           >
//             {isGenerating ? "Generating..." : "Generate DOCX"}
//           </DropdownMenuItem>
//         )}

//         {/* 🔄 Aksi tambahan berdasarkan status dokumen */}
//         {dynamicActions.length > 0 && <DropdownMenuSeparator />}
//         {dynamicActions.map((action) => (
//           <DropdownMenuItem
//             key={action}
//             onClick={() => handleAction(action, undefined)}
//           >
//             {action}
//           </DropdownMenuItem>
//         ))}

//         <DropdownMenuSeparator />
        
//         {/* Aksi 'Delete' */}
//         <DropdownMenuItem
//           className="text-red-600 focus:text-red-600"
//           onClick={() => handleAction("Delete", onDelete)}
//           disabled={isDeleting}
//         >
//           {isDeleting ? "Deleting..." : "Delete"}
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal } from "lucide-react";

// interface ActionTableProps {
//   row: any;
//   type: string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onPrint?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void;
//   generatingId?: number | null;
//   deletingId?: number | null; // <-- 1. TAMBAHKAN PROP INI
// }

// const STATUS_FLOW: Record<string, string[]> = {
//   MOM: ["Review Mitra", "Signing Mitra", "Finish"],
//   JIK: ["Sirkulir TSAT", "Finish"],
//   NDA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MOU: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MSA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
// };

// // 🔧 Helper untuk aksi dinamis (case-insensitive)
// function getDynamicActions(type: string, status: string): string[] {
//   const upperType = type?.toUpperCase();
//   const flow = STATUS_FLOW[upperType];
//   if (!flow) return [];

//   const normalizedStatus = status?.trim().toUpperCase();

//   switch (normalizedStatus) {
//     case "REVIEW MITRA":
//     case "REVIEW LEGAL TSAT":
//       return ["Approve"];
//     case "SIRKULIR TSAT":
//       return ["Upload"];
//     case "SIGNING MITRA":
//       return ["Sign"];
//     case "DRAFT":
//       return ["Send"];
//     default:
//       return [];
//   }
// }

// export function ActionTable({
//   row,
//   type,
//   onView, // Prop ini bisa di-pass-through
//   onEdit, // Prop ini akan kita ganti dengan onCustomAction
//   onDelete, // Prop ini akan kita ganti dengan onCustomAction
//   onPrint,
//   onCustomAction,
//   generatingId,
//   deletingId, // <-- 2. TERIMA PROP INI
// }: ActionTableProps) {
//   const currentStatus = row?.progress?.status?.name || "Draft";
//   const dynamicActions = getDynamicActions(type, currentStatus);
//   const isDraft = currentStatus?.trim().toLowerCase() === "draft";

//   const isGenerating = generatingId === row.id;
//   const isDeleting = deletingId === row.id; // <-- 3. TAMBAHKAN LOGIKA INI
//   const showDocxButton =
//     type.toLowerCase() === "jik" || type.toLowerCase() === "mom";
//   // && !isDraft
  
//   // Gunakan onCustomAction jika tersedia, jika tidak, gunakan fallback (onView, onEdit, dll)
//   // Ini membuat komponen lebih fleksibel
//   const handleAction = (action: string, fallback: ((row: any) => void) | undefined) => {
//     if (onCustomAction) {
//       onCustomAction(action, row);
//     } else {
//       fallback?.(row);
//     }
//   };


//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="h-8 w-8 p-0">
//           <MoreHorizontal className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent align="end">
//         {/* --- 4. MODIFIKASI SEMUA AKSI UNTUK KONSISTENSI --- */}
        
//         {/* Aksi 'View' (opsional) */}
//         <DropdownMenuItem onClick={() => handleAction("View", onView)}>
//           View
//         </DropdownMenuItem>

//         {/* Aksi 'Edit' */}
//         <DropdownMenuItem onClick={() => handleAction("Edit", onEdit)}>
//           Edit
//         </DropdownMenuItem>

//         {/* 🖨️ Tombol Print — hanya muncul jika status ≠ Draft */}
//         {!isDraft && (
//           <DropdownMenuItem onClick={() => handleAction("Print", onPrint)}>
//             Print
//           </DropdownMenuItem>
//         )}

//         {/* 📄 Tombol Generate DOCX — hanya untuk JIK/MOM */}
//         {showDocxButton && (
//           <DropdownMenuItem
//             onClick={() => handleAction("Generate DOCX", undefined)}
//             disabled={isGenerating}
//           >
//             {isGenerating ? "Generating..." : "Generate DOCX"}
//           </DropdownMenuItem>
//         )}

//         {/* 🔄 Aksi tambahan berdasarkan status dokumen */}
//         {dynamicActions.length > 0 && <DropdownMenuSeparator />}
//         {dynamicActions.map((action) => (
//           <DropdownMenuItem
//             key={action}
//             onClick={() => handleAction(action, undefined)}
//           >
//             {action}
//           </DropdownMenuItem>
//         ))}

//         <DropdownMenuSeparator />
        
//         {/* Aksi 'Delete' */}
//         <DropdownMenuItem
//           className="text-red-600 focus:text-red-600"
//           onClick={() => handleAction("Delete", onDelete)}
//           disabled={isDeleting}
//         >
//           {isDeleting ? "Deleting..." : "Delete"}
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal } from "lucide-react";

// interface ActionTableProps {
//   row: any;
//   type: string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onPrint?: (row: any) => void; 
//   onCustomAction?: (action: string, row: any) => void;
//   generatingId?: number | null; // <-- 1. TAMBAHKAN PROP INI
// }

// const STATUS_FLOW: Record<string, string[]> = {
//   MOM: ["Review Mitra", "Signing Mitra", "Finish"],
//   JIK: ["Sirkulir TSAT", "Finish"],
//   NDA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MOU: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MSA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
// };

// // 🔧 Helper untuk aksi dinamis (case-insensitive)
// function getDynamicActions(type: string, status: string): string[] {
//   const upperType = type?.toUpperCase();
//   const flow = STATUS_FLOW[upperType];
//   if (!flow) return [];

//   const normalizedStatus = status?.trim().toUpperCase();

//   switch (normalizedStatus) {
//     case "REVIEW MITRA":
//     case "REVIEW LEGAL TSAT":
//       return ["Approve"];
//     case "SIRKULIR TSAT":
//       return ["Upload"];
//     case "SIGNING MITRA":
//       return ["Sign"];
//     case "DRAFT":
//       return ["Send"];
//     default:
//       return [];
//   }
// }

// export function ActionTable({
//   row,
//   type,
//   onView,
//   onEdit,
//   onDelete,
//   onPrint,
//   onCustomAction,
//   generatingId, // <-- 2. TERIMA PROP INI
// }: ActionTableProps) {
//   const currentStatus = row?.progress?.status?.name || "Draft";
//   const dynamicActions = getDynamicActions(type, currentStatus);
//   const isDraft = currentStatus?.trim().toLowerCase() === "draft";

//   // --- 3. TAMBAHKAN LOGIKA INI ---
//   const isGenerating = generatingId === row.id;
//   const showDocxButton = (type.toLowerCase() === 'jik' || type.toLowerCase() === 'mom') ;
//   // && !isDraft
//   // --- AKHIR TAMBAHAN ---

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="h-8 w-8 p-0">
//           <MoreHorizontal className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent align="end">
//         <DropdownMenuItem onClick={() => onView?.(row)}>View</DropdownMenuItem>
//         <DropdownMenuItem onClick={() => onEdit?.(row)}>Edit</DropdownMenuItem>

//         {/* 🖨️ Tombol Print — hanya muncul jika status ≠ Draft */}
//         {!isDraft && (
//           <DropdownMenuItem onClick={() => onPrint?.(row)}>
//             Print
//           </DropdownMenuItem>
//         )}

//         {/* --- 4. TAMBAHKAN ITEM MENU INI --- */}
//         {/* 📄 Tombol Generate DOCX — hanya untuk JIK/MOM dan status ≠ Draft */}
//         {showDocxButton && (
//           <DropdownMenuItem
//             onClick={() => onCustomAction?.("Generate DOCX", row)}
//             disabled={isGenerating}
//           >
//             {isGenerating ? "Generating..." : "Generate DOCX"}
//           </DropdownMenuItem>
//         )}
//         {/* --- AKHIR TAMBAHAN --- */}


//         {/* 🔄 Aksi tambahan berdasarkan status dokumen */}
//         {dynamicActions.length > 0 && <DropdownMenuSeparator />}
//         {dynamicActions.map((action) => (
//           <DropdownMenuItem
//             key={action}
//             onClick={() => onCustomAction?.(action, row)}
//           >
//             {action}
//           </DropdownMenuItem>
//         ))}

//         <DropdownMenuSeparator />
//         <DropdownMenuItem
//           className="text-red-600 focus:text-red-600"
//           onClick={() => onDelete?.(row)}
//         >
//           Delete
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal } from "lucide-react";

// interface ActionTableProps {
//   row: any;
//   type: string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onPrint?: (row: any) => void; // 🆕 handler print
//   onCustomAction?: (action: string, row: any) => void;
// }

// const STATUS_FLOW: Record<string, string[]> = {
//   MOM: ["Review Mitra", "Signing Mitra", "Finish"],
//   JIK: ["Sirkulir TSAT", "Finish"],
//   NDA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MOU: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
//   MSA: [
//     "Review Mitra",
//     "Review Legal TSAT",
//     "Sirkulir TSAT",
//     "Signing Mitra",
//     "Finish",
//   ],
// };

// // 🔧 Helper untuk aksi dinamis (case-insensitive)
// function getDynamicActions(type: string, status: string): string[] {
//   const upperType = type?.toUpperCase();
//   const flow = STATUS_FLOW[upperType];
//   if (!flow) return [];

//   const normalizedStatus = status?.trim().toUpperCase();

//   switch (normalizedStatus) {
//     case "REVIEW MITRA":
//     case "REVIEW LEGAL TSAT":
//       return ["Approve"];
//     case "SIRKULIR TSAT":
//       return ["Upload"];
//     case "SIGNING MITRA":
//       return ["Sign"];
//     case "DRAFT":
//       return ["Send"];
//     default:
//       return [];
//   }
// }

// export function ActionTable({
//   row,
//   type,
//   onView,
//   onEdit,
//   onDelete,
//   onPrint,
//   onCustomAction,
// }: ActionTableProps) {
//   const currentStatus = row?.progress?.status?.name || "Draft";
//   const dynamicActions = getDynamicActions(type, currentStatus);
//   const isDraft = currentStatus?.trim().toLowerCase() === "draft";

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="h-8 w-8 p-0">
//           <MoreHorizontal className="h-4 w-4" />
//         </Button>
//       </DropdownMenuTrigger>

//       <DropdownMenuContent align="end">
//         <DropdownMenuItem onClick={() => onView?.(row)}>View</DropdownMenuItem>
//         <DropdownMenuItem onClick={() => onEdit?.(row)}>Edit</DropdownMenuItem>

//         {/* 🖨️ Tombol Print — hanya muncul jika status ≠ Draft */}
//         {!isDraft && (
//           <DropdownMenuItem onClick={() => onPrint?.(row)}>
//             Print
//           </DropdownMenuItem>
//         )}

//         {/* 🔄 Aksi tambahan berdasarkan status dokumen */}
//         {dynamicActions.length > 0 && <DropdownMenuSeparator />}
//         {dynamicActions.map((action) => (
//           <DropdownMenuItem
//             key={action}
//             onClick={() => onCustomAction?.(action, row)}
//           >
//             {action}
//           </DropdownMenuItem>
//         ))}

//         <DropdownMenuSeparator />
//         <DropdownMenuItem
//           className="text-red-600 focus:text-red-600"
//           onClick={() => onDelete?.(row)}
//         >
//           Delete
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }
