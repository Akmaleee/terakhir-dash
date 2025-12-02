import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

interface VerifyParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const approver = await prisma.momApprover.findUnique({
    where: { verify_token: token },
  });

  if (!approver) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/verification/invalid`);
  }

  if (!approver.expires_at || approver.expires_at < new Date()) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/verification/expired`);
  }

  // mark approval
  await prisma.momApprover.update({
    where: { id: approver.id },
    data: {
      is_approved: true,
      verify_token: null, // prevent reuse
      expires_at: null,
    },
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/verification/approved`);
}


// export async function GET(req: NextRequest, { params }: VerifyParams) {
//   const id = Number(params.momApprovalId);

//   const approver = await prisma.momApprover.findUnique({
//     where: { id },
//   });

//   if (!approver) {
//     return NextResponse.redirect(
//       `${process.env.NEXT_PUBLIC_BASE_URL}/verification/invalid`
//     );
//   }

//   // Mark approve
//   await prisma.momApprover.update({
//     where: { id },
//     data: { is_approved: true },
//   });

//   return NextResponse.redirect(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/verification/approved`
//   );
// }
