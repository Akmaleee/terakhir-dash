import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres"; // sesuaikan dengan path kamu

export async function GET() {
  try {
    // const ndas = await prisma.progress.findMany({
    //   include: {
    //     company: true, // kalau mau tampilkan data perusahaan juga
    //     step: true,
    //     status: true,
    //     documents: true,
    //   },
    //   where: {
    //     step: {
    //         name: "NDA",
    //     }
    //   },
    // });

    const ndas = await prisma.document.findMany({
      include: {
        progress: {
          include: {
            company: true,
            step: true,
            status: true,
          },
        },
      },
      where: {
        progress: {
          step: {
              name: "NDA",
          }
        }
      },
    });

    return NextResponse.json(ndas);
  } catch (err) {
    console.error("❌ Error get mom:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}