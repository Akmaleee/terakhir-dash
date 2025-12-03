import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Perbaikan tipe untuk Next.js 15
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID tidak ditemukan" }, { status: 400 });
    }

    // Soft Delete: Update deleted_at
    const deletedCompany = await prisma.company.update({
      where: { id: Number(id) },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ message: "Company deleted", data: deletedCompany });
  } catch (err) {
    console.error("❌ Error deleting company:", err);
    return NextResponse.json({ error: "Gagal menghapus perusahaan" }, { status: 500 });
  }
}