import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";
import { getCurrentUser, getUserFromCookie } from "@/lib/auth-server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // 1. Coba ambil session dari Header (Middleware)
    let session = await getCurrentUser();

    // 2. Jika gagal (misal middleware tidak jalan di API), coba ambil dari Cookie langsung
    if (!session) {
      session = await getUserFromCookie();
    }

    // 3. Jika masih tidak ada session, tolak akses
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: "Sesi tidak valid. Silakan login ulang." },
        { status: 401 }
      );
    }

    // 4. Parse body request
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password wajib diisi" },
        { status: 400 }
      );
    }

    // 5. Ambil user dari Database
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.userId) },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan di database" },
        { status: 404 }
      );
    }

    // 6. Verifikasi Password dengan Bcrypt
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Password salah!" },
        { status: 403 } // 403 Forbidden
      );
    }

    // 7. Sukses
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ Verify Password Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server internal." },
      { status: 500 }
    );
  }
}