import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete document
    const deletedDoc = await prisma.document.update({
      where: { id: Number(id) },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ message: "Document deleted successfully", data: deletedDoc });
  } catch (err) {
    console.error("❌ Error deleting document:", err);
    return NextResponse.json({ error: "Gagal menghapus dokumen" }, { status: 500 });
  }
}