import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";
import nodemailer from "nodemailer";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { id, type, action, current_status, url } = await req.json();

    // 🧩 Validasi
    if (!id || !action)
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });

    // 🧭 Mapping status dan step
    const STATUS_MAP: Record<string, number> = {
      Approve: 2,
      Upload: 4,
      Sign: 5,
    };

    const STEP_MAP: Record<string, number> = {
      MOM: 1,
      NDA: 2,
      JIK: 3,
      MSA: 4,
      MOU: 5,
    };

    let document_data = null;

    // 🧱 Kondisi per type
    if (type === "MOM") {
      STATUS_MAP.Send = 1;
      STATUS_MAP.Approve = 4;

      document_data = await prisma.mom.findUnique({
        where: { id },
        include: { 
          progress: {
            include: {
              documents: true,
            },
          },
          mom_approvers: { include: { approver: true } }, // contoh relasi lain 
        },
      });

      // SMTP: send email for verification
      if (action === "Approve") {
        const allApprovers = document_data?.mom_approvers || [];

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        // ========= DOWNLOAD ATTACHMENT =========
        const fileUrl = document_data?.progress?.documents?.[0]?.document_url;

        let attachmentBuffer = null;
        let fileName = "attachment.docx";

        if (fileUrl) {
          try {
            const fileRes = await fetch(fileUrl);
            if (!fileRes.ok) throw new Error("Failed downloading file");

            const arrayBuffer = await fileRes.arrayBuffer();
            attachmentBuffer = Buffer.from(arrayBuffer);

            fileName = decodeURIComponent(fileUrl.split("/").pop() || fileName);
          } catch (err) {
            console.error("Attachment download failed:", err);
          }
        }

        const formattedDate = document_data?.date
          ? new Date(document_data.date).toLocaleDateString()
          : "-";

        // ========= SEND EMAIL TO EACH APPROVER WITH UNIQUE URL =========
        for (const approver of allApprovers) {
          if (!approver.approver.email) continue;

          // generate random token
          const token = crypto.randomBytes(32).toString("hex");

          // save token to DB
          await prisma.momApprover.update({
            where: { id: approver.id },
            data: {
              verify_token: token,
              expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h expiry
            },
          });

          const verifUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mom/verify/${token}`;

          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: approver.approver.email,
            subject: `MOM Approval Update - ${document_data?.title}`,
            html: `
              <p>Hello <b>${approver.approver.name}</b>,</p>
              <p>A new approval action has been made on this MOM.</p>

              <p><b>Title:</b> ${document_data?.title}</p>
              <p><b>Date:</b> ${formattedDate}</p>

              <p>Please continue your approval here:</p>
              <a href="${verifUrl}" style="color:blue;">Verify MOM</a>
            `,
            attachments: attachmentBuffer
              ? [
                  {
                    filename: fileName,
                    content: attachmentBuffer,
                  },
                ]
              : [],
          });
        }

        console.log("📨 Email sent to:", allApprovers.map(x => x.approver.email));
      }
    }

    if (["NDA", "MOU", "MSA"].includes(type.toUpperCase())) {
      if (current_status === "Review Legal Tsat") STATUS_MAP.Approve = 3;
      if (current_status === "Signing Mitra") STATUS_MAP.Upload = 5;

      document_data = await prisma.document.findUnique({
        where: { id },
        include: { progress: { include: { step: true, status: true } } },
      });
    }

    if (type === "JIK") {
      STATUS_MAP.Send = 3;
      STATUS_MAP.Upload = 5;

      document_data = await prisma.jik.findUnique({
        where: { id },
        include: { progress: true },
      });
    }

    const nextStatus = STATUS_MAP[action] || null;
    if (!nextStatus)
      return NextResponse.json({ error: "Invalid action or status map" }, { status: 400 });

    console.log("🧾 Update progress:", { id, type, action, nextStatus, current_status, url, document_data });

    // 🚀 Transaction atomic
    const result = await prisma.$transaction(async (tx) => {
      const new_progress = await tx.progress.create({
        data: {
          company_id: document_data.company_id || document_data?.progress.company_id,
          step_id: STEP_MAP[type.toUpperCase()],
          status_id: nextStatus,
        },
      });

      let document_record = null;

      // Kalau ada file yang di-upload
      // if (url && (type.toLowerCase() === "jik" || type.toLowerCase() === "mom")) {
      //   document_record = await tx.document.create({
      //     data: {
      //       progress_id: new_progress.id,
      //       document_url: url,
      //     },
      //   });
      // }

      // Handle update progress_id in document
      // MSA, MOU & NDA
      if (["NDA", "MOU", "MSA"].includes(type.toUpperCase())) {
        const updateData: any = {
          progress_id: new_progress.id,
        };

        // kalau ada file URL → update document_url
        if (url) {
          updateData.document_url = url;
        }

        await tx.document.update({
          where: { id },
          data: updateData,
        });
      }


      // Update relasi ke dokumen utama
      if (type.toUpperCase() === "JIK") {
        await tx.jik.update({
          where: { id },
          data: { progress_id: new_progress.id },
        });

        // update progress id on document
        if (document_data?.progress?.documents?.[0]?.id) {
          await tx.document.update({
            where: { id: document_data?.progress?.documents?.[0]?.id },
            data: { progress_id: new_progress.id },
          });
        } else {
          console.log("➡️ No existing document, generating new DOCX...");

          const uploadedUrl = await generateAndUploadDocxJIKServer(
            Number(id),
            document_data?.title || "JIK"
          );

          // SIMPAN DOCUMENT BARU
          await tx.document.create({
            data: {
              progress_id: new_progress.id,
              document_url: uploadedUrl,
            },
          });

          console.log("📄 New document created with uploaded file:", uploadedUrl);
        }
      } else if (type.toUpperCase() === "MOM") {
        // update progress id on mom
        await tx.mom.update({
          where: { id },
          data: { progress_id: new_progress.id },
        });
        
        // update progress id on document
        if (document_data?.progress?.documents?.[0]?.id) {
          await tx.document.update({
            where: { id: document_data?.progress?.documents?.[0]?.id },
            data: { progress_id: new_progress.id },
          });
        } else {
          console.log("➡️ No existing document, generating new DOCX...");

          const uploadedUrl = await generateAndUploadDocxServer(
            Number(id),
            document_data?.title || "MOM"
          );

          // SIMPAN DOCUMENT BARU
          await tx.document.create({
            data: {
              progress_id: new_progress.id,
              document_url: uploadedUrl,
            },
          });

          console.log("📄 New document created with uploaded file:", uploadedUrl);
        }
      }

      return { new_progress, document_record };
    });

    // ✅ Return sukses
    return NextResponse.json({
      message: `Progress updated to progress id "${result.new_progress.id}" for ${type}`,
      id,
      type,
      action,
      document: result.document_record,
    });
  } catch (err) {
    console.error("❌ Error updating progress:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function generateAndUploadDocxServer(momId: number, momTitle: string) {
  console.log(`▶️ Generate DOCX server-side for MOM ${momId}`);

  // 1. CALL generate-docx API (internal)
  const docxResponse = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mom/generate-docx`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ momId }),
    }
  );

  if (!docxResponse.ok) {
    const err = await docxResponse.json();
    throw new Error(err.error || "DOCX generation failed");
  }

  const blob = await docxResponse.blob();

  // 2. Filename
  const fileName = `MOM_${momTitle.replace(/ /g, "_")}_${momId}.docx`;

  // 3. Convert blob -> new Blob (compatible with FormData)
  const newBlob = new Blob([await blob.arrayBuffer()], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  // 4. Prepare form-data
  const formData = new FormData();
  formData.append("file", newBlob, fileName);

  // 5. Upload to external server
  const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_AI_SERVICE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();
  const uploadedUrl = uploadResult?.data?.url;

  if (!uploadedUrl) {
    throw new Error("Upload success but URL not returned");
  }

  console.log("📄 DOCX uploaded URL:", uploadedUrl);
  return uploadedUrl;
}

async function generateAndUploadDocxJIKServer(jikId: number, jikTitle: string) {
  console.log(`▶️ Generate DOCX server-side for MOM ${jikId}`);

  // 1. CALL generate-docx API (internal)
  const docxResponse = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/jik/generate-docx`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jikId }),
    }
  );

  if (!docxResponse.ok) {
    const err = await docxResponse.json();
    throw new Error(err.error || "DOCX generation failed");
  }

  const blob = await docxResponse.blob();

  // 2. Filename
  const fileName = `MOM_${jikTitle.replace(/ /g, "_")}_${jikId}.docx`;

  // 3. Convert blob -> new Blob (compatible with FormData)
  const newBlob = new Blob([await blob.arrayBuffer()], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  // 4. Prepare form-data
  const formData = new FormData();
  formData.append("file", newBlob, fileName);

  // 5. Upload to external server
  const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_AI_SERVICE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();
  const uploadedUrl = uploadResult?.data?.url;

  if (!uploadedUrl) {
    throw new Error("Upload success but URL not returned");
  }

  console.log("📄 DOCX uploaded URL:", uploadedUrl);
  return uploadedUrl;
}
