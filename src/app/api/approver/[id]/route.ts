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

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> } // Next.js 15: params adalah Promise
) {
  try {
    const params = await props.params;
    const id = parseInt(params.id);
    const body = await request.json();

    const { name, type, email, jabatan, nik } = body;

    const updatedApprover = await prisma.approver.update({
      where: { id },
      data: {
        name,
        type,
        email,
        jabatan,
        nik,
      },
    });

    return NextResponse.json(updatedApprover);
  } catch (error: any) {
    console.error("Error updating approver:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate data approver", details: error.message },
      { status: 500 }
    );
  }
}