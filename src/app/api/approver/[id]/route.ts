import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deletedApprover = await prisma.approver.update({
      where: { id: Number(id) },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ message: "Approver deleted", data: deletedApprover });
  } catch (err) {
    console.error("❌ Error deleting approver:", err);
    return NextResponse.json({ error: "Gagal menghapus approver" }, { status: 500 });
  }
}