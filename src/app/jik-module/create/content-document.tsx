// src/app/jik-module/create/content-document.tsx

"use client";

import { useMemo, useReducer, useRef, useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { FaPlus } from "react-icons/fa";
import RichTextInput from "@/components/input/rich-text-input";

// === CONSTANT: DEFAULT CONTENT UNTUK LATAR BELAKANG ===
const DEFAULT_LATAR_BELAKANG_HTML = `
<ol>
  <li>
    <strong>Portfolio Orchestration pada Corporate Strategic Scenario Telkom (CSS Telkom) 2021–2025 untuk Telkomsat sebagai Satellite Business Line:</strong> 
    Satelit merupakan salah satu portfolio Telkom Group yang termasuk dalam domain Digital Connectivity. Berdasarkan penilaian portofolio (portfolio assessment), satelit merupakan salah satu business line di Telkom Group yang berada pada kuadran selective dan mendapat arahan untuk berani melakukan investasi (bold investment) dengan tujuan membangun kepemimpinan pangsa pasar satelit (sesuai dengan CSS Strategic Initiatives Portfolio Direction 4B / CSS PO 4B).
  </li>
  <li>
    <strong>Portfolio Orchestration pada Corporate Strategic Scenario Telkom (CSS Telkom) 2024–2026 untuk Telkomsat sebagai Satellite Business Line:</strong> 
    Sesuai dengan pemetaan portofolio produk digital Telkom yang tercantum dalam CSS Telkom 2024-2026, satelit (Telkomsat) adalah salah satu business line yang berada di kuadran Strengthen yang diarahkan untuk berinvestasi untuk teknologi baru dengan tujuan mempertahankan posisi #1 penguasaan pasar di bisnis konektivitas digital berbasis satelit. Selaras dengan CSS Strategic Intention 1A, bahwa Telkomsat agar mempertahankan posisi #1 penguasaan pasar dengan tetap menjaga struktur biaya yang optimal dan Strategic Intention 4A, meningkatkan kinerja bisnis melalui financing yang optimal untuk menjaga kesehatan keuangan perusahaan.
  </li>
  <li>
    <strong>Corporate Strategy Telkomsat pada Telkomsat Business Plan 2021-2025:</strong> 
    Salah satu bagian Cooperative Corporate Strategy dari “How To Compete” Telkomsat adalah Partnership, dengan inisiatif programnya berupa: (1) Bermitra dengan pemain terkemuka (leading player) & mitra-mitra kunci (key partners) yang relevan sebagai mitra yang strategis; (2) Memimpin model inovasi dan pola kemitraan yang baru.
  </li>
  <li>
    <strong>Corporate Strategy Telkomsat pada Telkomsat’s Subsidiary Business Plan 2021-2025, 2022-2024, dan 2023-2025:</strong> 
    Salah satu Corporate Strategy “How To Compete” Telkomsat adalah Revamp Operation dengan inisiatif program di sisi Infrastruktur adalah: (1) Memaksimalkan penggunaan kapasitas satelit; (2) Memaksimalkan pemanfaatan aset dan melakukan perolehan satelit baru (melalui metode borrow/buy/built); dan (3) Penerapan strategi untuk berinvestasi pada infrastruktur dalam rangka memperluas bisnis. Revamp Operation disisi infrastruktur ini tentu saja berkaitan dengan market projection di Indonesia yang dilakukan oleh Konsultan IDC (2020) bahwa prediksi pertumbuhan majemuk market satelit di dalam negeri dari 2021 – 2025 adalah sebesar 6,6% (CAGR 2021-2025). Prediksi pertumbuhan majemuk market satelit di dalam negeri dari tahun 2022-2024 berdasarkan laporan dari Konsultan IDC (2021) menjadi sebesar 7,1% (CAGR 2022-2024). Prediksi pertumbuhan majemuk market satelit di dalam negeri dari tahun 2022-2025 berdasarkan laporan dari Konsultan IDC (2022) menjadi sebesar 6,8% (CAGR 2022-2025). Laporan dari Konsultan IDC terkini (2023) menyampaikan bahwa prediksi pertumbuhan majemuk market satelit di dalam negeri dari tahun 2022-2026 adalah sebesar 6,9% (CAGR 2022-2026).
  </li>
  <li>
    <strong>Telkomsat Main Objectives of RJPP 2024 – 2026:</strong> 
    pada kategori Product and Services dimana Telkomsat diminta mengembangkan produk dan layanan berdasarkan industri vertikal yang didorong oleh pasar dan tumbuh tinggi salah satunya di maritim.
  </li>
  <li>
    <strong>Peraturan Direksi No. 030/D0.000/HK000/TSAT/10.2024 tentang Pedoman Pengelolaan Kerja Sama Kemitraan untuk Penyediaan dan/atau, Pengembangan Infrastruktur dan Layanan.</strong>
  </li>
</ol>
`;

// === tipe yang diekspor ke parent ===
export type ContentSection = {
  id: string; // Tambahkan ID untuk tracking
  title: string;
  // Content bisa berupa JSONContent (dari editor) atau string (HTML default)
  content: JSONContent | string; 
};

// Tipe untuk state internal
type Section = ContentSection;

// Ini adalah daftar judul default
const DEFAULT_TITLES = [
  "Latar Belakang Inisiatif Kemitraan",
  "Maksud dan Tujuan Inisiatif",
  "Ruang Lingkup dan Deskripsi Inisiatif Kemitraan",
  "Asumsi-asumsi yang digunakan",
  "Analisis bisnis, cost benefit, analisis finansial, dan analisis risiko beserta mitigasi risiko",
  "Gambaran hak dan kewajiban",
  "Pengungkapan atas kebijakan/proses bisnis yang dikesampingkan",
  "Rekomendasi Keputusan",
  "Keputusan",
] as const;

// Konten kosong untuk Tiptap
const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// Tipe Aksi untuk Reducer
type Action =
  | { type: "add"; index: number; offset: -1 | 1 }
  | { type: "addEnd" }
  | { type: "remove"; index: number }
  | { type: "move"; index: number; dir: -1 | 1 }
  | { type: "update"; id: string; patch: Partial<Pick<Section, "title" | "content">> }
  | { type: "resetDefault" }
  | { type: "setInitial"; sections: ContentSection[] }; // Aksi untuk mode edit

// Props untuk komponen
interface Props {
  onChange: (sections: ContentSection[]) => void;
  initialContent?: ContentSection[]; // Tetap dukung initialContent
}

export default function ContentDocument({ onChange, initialContent }: Props) {
  const seq = useRef(0);
  const newId = () => `sec_${seq.current++}`;

  // Fungsi untuk membuat state awal
  const createInitialSections = (titles: readonly string[]): Section[] => {
    return titles.map((t) => {
      // Logic khusus: Jika judulnya "Latar Belakang...", isi dengan HTML default
      let content: JSONContent | string = EMPTY_DOC;
      
      if (t === "Latar Belakang Inisiatif Kemitraan") {
        content = DEFAULT_LATAR_BELAKANG_HTML;
      }

      return { 
        id: newId(), 
        title: t, 
        content: content
      };
    });
  };

  const initialSections = useMemo<Section[]>(
    () => createInitialSections(DEFAULT_TITLES),
    []
  );

  const reducer = (state: Section[], action: Action): Section[] => {
    switch (action.type) {
      case "add": {
        const idx = Math.max(
          0,
          Math.min(action.index + (action.offset === -1 ? 0 : 1), state.length)
        );
        const draft = [...state];
        draft.splice(idx, 0, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC });
        return draft;
      }
      case "addEnd":
        return [...state, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC }];
      case "remove":
        return state.length <= 1 ? state : state.filter((_, i) => i !== action.index);
      case "move": {
        const from = action.index;
        const to = from + action.dir;
        if (to < 0 || to >= state.length) return state;
        const draft = [...state];
        [draft[from], draft[to]] = [draft[to], draft[from]];
        return draft;
      }
      case "update":
        return state.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s));
      case "resetDefault":
        return createInitialSections(DEFAULT_TITLES);
      case "setInitial":
        // Pastikan konten dari DB memiliki ID unik dan konten yang valid
        return action.sections.map((s) => ({
          ...s,
          id: s.id || newId(), // Beri ID baru jika dari DB tidak ada
          content: s.content || EMPTY_DOC, // Pastikan content tidak null
        }));
      default:
        return state;
    }
  };

  const [sections, dispatch] = useReducer(reducer, initialSections);

  // Efek untuk memuat 'initialContent' saat mode edit
  const [isInitialContentApplied, setIsInitialContentApplied] = useState(false);

  useEffect(() => {
    if (initialContent && initialContent.length > 0 && !isInitialContentApplied) {
      // Ubah initialContent agar sesuai dengan tipe Section
      const sanitizedInitial = initialContent.map((s) => ({
        ...s,
        id: s.id || newId(), // Pastikan ada ID
        // Content dari DB bisa JSON atau string, pastikan fallback ke EMPTY_DOC
        content: (s.content || EMPTY_DOC), 
      }));
      dispatch({ type: "setInitial", sections: sanitizedInitial });
      setIsInitialContentApplied(true);
    }
  }, [initialContent, isInitialContentApplied]);

  // Efek untuk memberitahu parent jika ada perubahan
  useEffect(() => {
    onChange?.(sections);
  }, [sections, onChange]);

  return (
    <>
      <Header onReset={() => dispatch({ type: "resetDefault" })} />

      <div className="divide-y">
        {sections.map((s, i) => (
          <RichTextInput
            key={s.id} // Gunakan ID yang stabil
            className="py-6"
            index={i}
            total={sections.length}
            title={s.title}
            // Casting ke JSONContent agar prop type RichTextInput tidak error (padahal support string)
            content={s.content as JSONContent}
            onTitle={(v) => dispatch({ type: "update", id: s.id, patch: { title: v } })}
            onContent={(v) => dispatch({ type: "update", id: s.id, patch: { content: v } })}
            onAddBefore={() => dispatch({ type: "add", index: i, offset: -1 })}
            onAddAfter={() => dispatch({ type: "add", index: i, offset: 1 })}
            onMoveUp={() => dispatch({ type: "move", index: i, dir: -1 })}
            onMoveDown={() => dispatch({ type: "move", index: i, dir: 1 })}
            onRemove={() => dispatch({ type: "remove", index: i })}
          />
        ))}
      </div>

      <div className="w-full flex items-center justify-center mt-4">
        <button
          onClick={() => dispatch({ type: "addEnd" })}
          aria-label="Tambah Section di Akhir"
          className="flex items-center justify-center rounded-full border border-gray-300 p-2 hover:bg-gray-100 transition"
        >
          <FaPlus size={14} className="text-gray-600" />
        </button>
      </div>
    </>
  );
}

// Komponen Header yang menyediakan tombol Reset
function Header({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-xl font-semibold mr-auto">Content Document</h2>
      <button
        type="button" // Pastikan type="button" agar tidak men-submit form
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        onClick={onReset}
      >
        Reset ke Default
      </button>
    </div>
  );
}

// "use client";

// import { useMemo, useReducer, useRef, useEffect, useState } from "react";
// import type { JSONContent } from "@tiptap/react";
// import { FaPlus } from "react-icons/fa";
// import RichTextInput from "@/components/input/rich-text-input";

// // === tipe yang diekspor ke parent ===
// export type ContentSection = {
//   id: string; // Tambahkan ID untuk tracking
//   title: string;
//   content: JSONContent;
// };

// // Tipe untuk state internal
// type Section = ContentSection;

// // === CONSTANT: DEFAULT CONTENT UNTUK LATAR BELAKANG ===
// const DEFAULT_LATAR_BELAKANG_HTML = `
// <ol>
//   <li>
//     <strong>Portfolio Orchestration pada Corporate Strategic Scenario Telkom (CSS Telkom) 2021–2025 untuk Telkomsat sebagai Satellite Business Line:</strong> 
//     Satelit merupakan salah satu portfolio Telkom Group yang termasuk dalam domain Digital Connectivity. Berdasarkan penilaian portofolio (portfolio assessment), satelit merupakan salah satu business line di Telkom Group yang berada pada kuadran selective dan mendapat arahan untuk berani melakukan investasi (bold investment) dengan tujuan membangun kepemimpinan pangsa pasar satelit (sesuai dengan CSS Strategic Initiatives Portfolio Direction 4B / CSS PO 4B).
//   </li>
//   <li>
//     <strong>Portfolio Orchestration pada Corporate Strategic Scenario Telkom (CSS Telkom) 2024–2026 untuk Telkomsat sebagai Satellite Business Line:</strong> 
//     Sesuai dengan pemetaan portofolio produk digital Telkom yang tercantum dalam CSS Telkom 2024-2026, satelit (Telkomsat) adalah salah satu business line yang berada di kuadran Strengthen yang diarahkan untuk berinvestasi untuk teknologi baru dengan tujuan mempertahankan posisi #1 penguasaan pasar di bisnis konektivitas digital berbasis satelit. Selaras dengan CSS Strategic Intention 1A, bahwa Telkomsat agar mempertahankan posisi #1 penguasaan pasar dengan tetap menjaga struktur biaya yang optimal dan Strategic Intention 4A, meningkatkan kinerja bisnis melalui financing yang optimal untuk menjaga kesehatan keuangan perusahaan.
//   </li>
//   <li>
//     <strong>Corporate Strategy Telkomsat pada Telkomsat Business Plan 2021-2025:</strong> 
//     Salah satu bagian Cooperative Corporate Strategy dari “How To Compete” Telkomsat adalah Partnership, dengan inisiatif programnya berupa: (1) Bermitra dengan pemain terkemuka (leading player) & mitra-mitra kunci (key partners) yang relevan sebagai mitra yang strategis; (2) Memimpin model inovasi dan pola kemitraan yang baru.
//   </li>
//   <li>
//     <strong>Corporate Strategy Telkomsat pada Telkomsat’s Subsidiary Business Plan 2021-2025, 2022-2024, dan 2023-2025:</strong> 
//     Salah satu Corporate Strategy “How To Compete” Telkomsat adalah Revamp Operation dengan inisiatif program di sisi Infrastruktur adalah: (1) Memaksimalkan penggunaan kapasitas satelit; (2) Memaksimalkan pemanfaatan aset dan melakukan perolehan satelit baru (melalui metode borrow/buy/built); dan (3) Penerapan strategi untuk berinvestasi pada infrastruktur dalam rangka memperluas bisnis. Revamp Operation disisi infrastruktur ini tentu saja berkaitan dengan market projection di Indonesia yang dilakukan oleh Konsultan IDC (2020) bahwa prediksi pertumbuhan majemuk market satelit di dalam negeri dari 2021 – 2025 adalah sebesar 6,6% (CAGR 2021-2025). Prediksi pertumbuhan majemuk market satelit di dalam negeri dari tahun 2022-2024 berdasarkan laporan dari Konsultan IDC (2021) menjadi sebesar 7,1% (CAGR 2022-2024). Prediksi pertumbuhan majemuk market satelit di dalam negeri dari tahun 2022-2025 berdasarkan laporan dari Konsultan IDC (2022) menjadi sebesar 6,8% (CAGR 2022-2025). Laporan dari Konsultan IDC terkini (2023) menyampaikan bahwa prediksi pertumbuhan majemuk market satelit di dalam negeri dari tahun 2022-2026 adalah sebesar 6,9% (CAGR 2022-2026).
//   </li>
//   <li>
//     <strong>Telkomsat Main Objectives of RJPP 2024 – 2026:</strong> 
//     pada kategori Product and Services dimana Telkomsat diminta mengembangkan produk dan layanan berdasarkan industri vertikal yang didorong oleh pasar dan tumbuh tinggi salah satunya di maritim.
//   </li>
//   <li>
//     <strong>Peraturan Direksi No. 030/D0.000/HK000/TSAT/10.2024 tentang Pedoman Pengelolaan Kerja Sama Kemitraan untuk Penyediaan dan/atau, Pengembangan Infrastruktur dan Layanan.</strong>
//   </li>
// </ol>
// `;

// // Ini adalah daftar judul default yang Anda minta
// const DEFAULT_TITLES = [
//   "Latar Belakang Inisiatif Kemitraan",
//   "Maksud dan Tujuan Inisiatif",
//   "Ruang Lingkup dan Deskripsi Inisiatif Kemitraan",
//   "Asumsi-asumsi yang digunakan",
//   "Analisis bisnis, cost benefit, analisis finansial, dan analisis risiko beserta mitigasi risiko",
//   "Gambaran hak dan kewajiban",
//   "Pengungkapan atas kebijakan/proses bisnis yang dikesampingkan",
//   "Rekomendasi Keputusan",
//   "Keputusan",
// ] as const;

// // Konten kosong untuk Tiptap
// const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// // Tipe Aksi untuk Reducer
// type Action =
//   | { type: "add"; index: number; offset: -1 | 1 }
//   | { type: "addEnd" }
//   | { type: "remove"; index: number }
//   | { type: "move"; index: number; dir: -1 | 1 }
//   | { type: "update"; id: string; patch: Partial<Pick<Section, "title" | "content">> }
//   | { type: "resetDefault" }
//   | { type: "setInitial"; sections: ContentSection[] }; // Aksi untuk mode edit

// // Props untuk komponen
// interface Props {
//   onChange: (sections: ContentSection[]) => void;
//   initialContent?: ContentSection[]; // Tetap dukung initialContent
// }

// export default function ContentDocument({ onChange, initialContent }: Props) {
//   const seq = useRef(0);
//   const newId = () => `sec_${seq.current++}`;

//   // Fungsi untuk membuat state awal
//   const createInitialSections = (titles: readonly string[]): Section[] => {
//     return titles.map((t) => ({ id: newId(), title: t, content: EMPTY_DOC }));
//   };

//   const initialSections = useMemo<Section[]>(
//     () => createInitialSections(DEFAULT_TITLES),
//     []
//   );

//   const reducer = (state: Section[], action: Action): Section[] => {
//     switch (action.type) {
//       case "add": {
//         const idx = Math.max(
//           0,
//           Math.min(action.index + (action.offset === -1 ? 0 : 1), state.length)
//         );
//         const draft = [...state];
//         draft.splice(idx, 0, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC });
//         return draft;
//       }
//       case "addEnd":
//         return [...state, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC }];
//       case "remove":
//         return state.length <= 1 ? state : state.filter((_, i) => i !== action.index);
//       case "move": {
//         const from = action.index;
//         const to = from + action.dir;
//         if (to < 0 || to >= state.length) return state;
//         const draft = [...state];
//         [draft[from], draft[to]] = [draft[to], draft[from]];
//         return draft;
//       }
//       case "update":
//         return state.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s));
//       case "resetDefault":
//         return createInitialSections(DEFAULT_TITLES);
//       case "setInitial":
//         // Pastikan konten dari DB memiliki ID unik dan konten yang valid
//         return action.sections.map((s) => ({
//           ...s,
//           id: s.id || newId(), // Beri ID baru jika dari DB tidak ada
//           content: s.content || EMPTY_DOC, // Pastikan content tidak null
//         }));
//       default:
//         return state;
//     }
//   };

//   const [sections, dispatch] = useReducer(reducer, initialSections);

//   // Efek untuk memuat 'initialContent' saat mode edit
//   // Gunakan useState untuk memastikan ini hanya berjalan sekali
//   const [isInitialContentApplied, setIsInitialContentApplied] = useState(false);

//   useEffect(() => {
//     if (initialContent && initialContent.length > 0 && !isInitialContentApplied) {
//       // Ubah initialContent agar sesuai dengan tipe Section (terutama 'content' tidak boleh null)
//       const sanitizedInitial = initialContent.map((s) => ({
//         ...s,
//         id: s.id || newId(), // Pastikan ada ID
//         content: (s.content || EMPTY_DOC) as JSONContent, // Pastikan content valid
//       }));
//       dispatch({ type: "setInitial", sections: sanitizedInitial });
//       setIsInitialContentApplied(true);
//     }
//   }, [initialContent, isInitialContentApplied]);

//   // Efek untuk memberitahu parent jika ada perubahan
//   useEffect(() => {
//     onChange?.(sections);
//   }, [sections, onChange]);

//   return (
//     <>
//       <Header onReset={() => dispatch({ type: "resetDefault" })} />

//       <div className="divide-y">
//         {sections.map((s, i) => (
//           <RichTextInput
//             key={s.id} // Gunakan ID yang stabil
//             className="py-6"
//             index={i}
//             total={sections.length}
//             title={s.title}
//             content={s.content}
//             onTitle={(v) => dispatch({ type: "update", id: s.id, patch: { title: v } })}
//             onContent={(v) => dispatch({ type: "update", id: s.id, patch: { content: v } })}
//             onAddBefore={() => dispatch({ type: "add", index: i, offset: -1 })}
//             onAddAfter={() => dispatch({ type: "add", index: i, offset: 1 })}
//             onMoveUp={() => dispatch({ type: "move", index: i, dir: -1 })}
//             onMoveDown={() => dispatch({ type: "move", index: i, dir: 1 })}
//             onRemove={() => dispatch({ type: "remove", index: i })}
//           />
//         ))}
//       </div>

//       <div className="w-full flex items-center justify-center mt-4">
//         <button
//           onClick={() => dispatch({ type: "addEnd" })}
//           aria-label="Tambah Section di Akhir"
//           className="flex items-center justify-center rounded-full border border-gray-300 p-2 hover:bg-gray-100 transition"
//         >
//           <FaPlus size={14} className="text-gray-600" />
//         </button>
//       </div>
//     </>
//   );
// }

// // Komponen Header yang menyediakan tombol Reset
// function Header({ onReset }: { onReset: () => void }) {
//   return (
//     <div className="flex items-center gap-2 mb-4">
//       <h2 className="text-xl font-semibold mr-auto">Content Document</h2>
//       <button
//         type="button" // Pastikan type="button" agar tidak men-submit form
//         className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
//         onClick={onReset}
//       >
//         Reset ke Default
//       </button>
//     </div>
//   );
// }

// "use client";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// // --- 1. PERBAIKAN IMPORT ---
// // Kita seharusnya mengimpor editor intinya, bukan wrapper inputnya
// import RichTextEditor from "@/components/rich-text-editor";
// // --- AKHIR PERBAIKAN ---
// import type { JSONContent } from "@tiptap/react";
// import { Plus, Trash2 } from "lucide-react";
// import { useEffect, useState } from "react";

// export interface ContentSection {
//   title: string;
//   content: JSONContent | null;
// }

// interface Props {
//   onChange: (sections: ContentSection[]) => void;
//   initialContent?: ContentSection[];
// }

// // Definisikan konten kosong standar untuk TipTap
// const defaultEmptyContent: JSONContent = {
//   type: "doc",
//   content: [
//     {
//       type: "paragraph",
//     },
//   ],
// };

// export default function ContentDocument({ onChange, initialContent }: Props) {
//   const [sections, setSections] = useState<ContentSection[]>([
//     { title: "Latar Belakang", content: null },
//     { title: "Tujuan", content: null },
//   ]);

//   // Efek untuk mengisi state internal jika ada initialContent (mode edit)
//   useEffect(() => {
//     if (initialContent && initialContent.length > 0) {
//       // Pastikan content yang null atau undefined tetap null
//       const sanitizedInitial = initialContent.map((s) => ({
//         ...s,
//         content: s.content || null,
//       }));
//       setSections(sanitizedInitial);
//     }
//   }, [initialContent]);

//   // Efek untuk memberitahu parent (page.tsx) jika ada perubahan
//   useEffect(() => {
//     onChange(sections);
//   }, [sections, onChange]);

//   const addSection = () => {
//     setSections((prev) => [
//       ...prev,
//       { title: "Judul Bagian Baru", content: null },
//     ]);
//   };

//   const removeSection = (index: number) => {
//     if (window.confirm("Yakin ingin menghapus bagian ini?")) {
//       setSections((prev) => prev.filter((_, i) => i !== index));
//     }
//   };

//   const updateTitle = (index: number, title: string) => {
//     setSections((prev) =>
//       prev.map((s, i) => (i === index ? { ...s, title } : s))
//     );
//   };

//   const updateContent = (index: number, content: JSONContent | null) => {
//     setSections((prev) =>
//       prev.map((s, i) => (i === index ? { ...s, content } : s))
//     );
//   };

//   return (
//     <div>
//       <h2 className="text-xl font-semibold mb-4">Content Document</h2>
//       <div className="flex flex-col gap-6">
//         {sections.map((section, index) => (
//           <div
//             key={index}
//             className="border border-border rounded-lg p-4 bg-gray-50/50"
//           >
//             <div className="flex items-center justify-between mb-3">
//               <Input
//                 value={section.title}
//                 onChange={(e) => updateTitle(index, e.target.value)}
//                 placeholder="Judul Bagian"
//                 className="text-lg font-medium border-0 shadow-none focus-visible:ring-0 !p-0"
//               />
//               <Button
//                 type="button"
//                 variant="ghost"
//                 size="icon"
//                 className="text-red-500 hover:text-red-600"
//                 onClick={() => removeSection(index)}
//                 disabled={sections.length <= 1} // tidak bisa hapus jika sisa 1
//               >
//                 <Trash2 className="w-4 h-4" />
//               </Button>
//             </div>

//             <div className="bg-white rounded-md">
//               {/* --- 2. PERBAIKAN KOMPONEN & PROPS --- */}
//               <RichTextEditor
//                 // Beri 'key' unik agar editor me-render ulang saat 'initialContent' dimuat
//                 key={
//                   initialContent
//                     ? `section-${index}-${initialContent.length}`
//                     : `section-${index}`
//                 }
//                 // Berikan 'defaultEmptyContent' jika 'section.content' adalah 'null'
//                 // Komponen RichTextEditor (index.tsx) menerima 'content'
//                 content={section.content || defaultEmptyContent}
//                 onChange={(newContent: JSONContent) =>
//                   updateContent(index, newContent)
//                 }
//               />
//               {/* --- AKHIR PERBAIKAN --- */}
//             </div>
//           </div>
//         ))}

//         <Button
//           type="button"
//           variant="outline"
//           onClick={addSection}
//           className="mt-2"
//         >
//           <Plus className="w-4 h-4 mr-2" />
//           Tambah Bagian
//         </Button>
//       </div>
//     </div>
//   );
// }


// "use client";

// import { useMemo, useReducer, useRef, useEffect } from "react";
// import type { JSONContent } from "@tiptap/react";
// import { FaPlus } from "react-icons/fa";
// import RichTextInput from "@/components/input/rich-text-input";

// // === tipe yang diekspor ke parent ===
// export type ContentSection = { title: string; content: JSONContent };

// // kalau mau simpan ke DB, bisa juga ubah menjadi:
// // export type StoredSection = { id: string; title: string; content: string };

// type Section = ContentSection;

// const DEFAULT_TITLES = [
//   "Latar Belakang Inisiatif Kemitraan",
//   "Maksud dan Tujuan Inisiatif",
//   "Ruang Lingkup dan Deskripsi Inisiatif Kemitraan",
//   "Asumsi-asumsi yang digunakan",
//   "Analisis bisnis, cost benefit, analisis finansial, dan analisis risiko beserta mitigasi risiko",
//   "Gambaran hak dan kewajiban",
//   "Pengungkapan atas kebijakan/proses bisnis yang dikesampingkan",
//   "Rekomendasi Keputusan",
//   "Keputusan",
// ] as const;

// const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// type Action =
//   | { type: "add"; index: number; offset: -1 | 1 }
//   | { type: "addEnd" }
//   | { type: "remove"; index: number }
//   | { type: "move"; index: number; dir: -1 | 1 }
//   | { type: "update"; id: string; patch: Partial<Pick<Section, "title" | "content">> }
//   | { type: "resetDefault" };

// export default function ContentDocument({
//   onChange,
// }: {
//   // ubah: parent sekarang terima JSON string
//   onChange?: (sections: ContentSection[]) => void;
// }) {
//   const seq = useRef(0);
//   const newId = () => `sec_${seq.current++}`;

//   const initialSections = useMemo<Section[]>(
//     () => DEFAULT_TITLES.map((t) => ({ id: newId(), title: t, content: EMPTY_DOC })),
//     []
//   );

//   const reducer = (state: Section[], action: Action): Section[] => {
//     switch (action.type) {
//       case "add": {
//         const idx = Math.max(
//           0,
//           Math.min(action.index + (action.offset === -1 ? 0 : 1), state.length)
//         );
//         const draft = [...state];
//         draft.splice(idx, 0, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC });
//         return draft;
//       }
//       case "addEnd":
//         return [...state, { id: newId(), title: "Bagian Baru", content: EMPTY_DOC }];
//       case "remove":
//         return state.length <= 1 ? state : state.filter((_, i) => i !== action.index);
//       case "move": {
//         const from = action.index;
//         const to = from + action.dir;
//         if (to < 0 || to >= state.length) return state;
//         const draft = [...state];
//         [draft[from], draft[to]] = [draft[to], draft[from]];
//         return draft;
//       }
//       case "update":
//         return state.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s));
//       case "resetDefault":
//         return DEFAULT_TITLES.map((t) => ({ id: newId(), title: t, content: EMPTY_DOC }));
//       default:
//         return state;
//     }
//   };

//   const [sections, dispatch] = useReducer(reducer, initialSections);

//   // 🔥 Emit hasil ke parent sebagai string JSON
//   useEffect(() => {
//     onChange?.(sections);
//   }, [sections, onChange]);

//   return (
//     <>
//       <Header onReset={() => dispatch({ type: "resetDefault" })} />

//       <div className="divide-y">
//         {sections.map((s, i) => (
//           <RichTextInput
//             key={s.id}
//             className="py-6"
//             index={i}
//             total={sections.length}
//             title={s.title}
//             content={s.content}
//             onTitle={(v) => dispatch({ type: "update", id: s.id, patch: { title: v } })}
//             onContent={(v) => dispatch({ type: "update", id: s.id, patch: { content: v } })}
//             onAddBefore={() => dispatch({ type: "add", index: i, offset: -1 })}
//             onAddAfter={() => dispatch({ type: "add", index: i, offset: 1 })}
//             onMoveUp={() => dispatch({ type: "move", index: i, dir: -1 })}
//             onMoveDown={() => dispatch({ type: "move", index: i, dir: 1 })}
//             onRemove={() => dispatch({ type: "remove", index: i })}
//           />
//         ))}
//       </div>

//       <div className="w-full flex items-center justify-center">
//         <button
//           onClick={() => dispatch({ type: "addEnd" })}
//           aria-label="Tambah Section"
//           className="flex items-center justify-center rounded-full border border-gray-300 p-2 hover:bg-gray-100 transition"
//         >
//           <FaPlus size={14} className="text-gray-600" />
//         </button>
//       </div>
//     </>
//   );
// }

// function Header({ onReset }: { onReset: () => void }) {
//   return (
//     <div className="flex items-center gap-2 mb-4">
//       <h1 className="text-xl font-semibold mr-auto">Dokumen Inisiatif</h1>
//       <button
//         className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
//         onClick={onReset}
//       >
//         Reset ke Default
//       </button>
//     </div>
//   );
// }
