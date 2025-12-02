"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CheckModalProps {
  open: boolean;
  onClose: () => void;
  mom: any;                // nanti bisa kamu detailkan
  onUpdateStatus: () => void;
}

export default function CheckModal({ open, onClose, mom, onUpdateStatus }: CheckModalProps) {
  if (!mom) return null;

  const approvers = mom.mom_approvers || [];
  const allApproved = approvers.every(a => a.is_approved === true);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Approval Status</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <table className="w-full border border-gray-300 rounded-md text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Waktu TTD</th>
              </tr>
            </thead>

            <tbody>
              {approvers.map((a) => {
                const approvedAt = a.is_approved ? new Date(a.updatedAt).toLocaleString() : "-";

                return (
                  <tr key={a.id}>
                    <td className="p-2 border">{a.approver?.name}</td>
                    <td className="p-2 border">{a.approver?.email}</td>

                    <td className="p-2 border">
                      {a.is_approved ? (
                        <span className="text-green-600 font-medium">Sudah TTD</span>
                      ) : (
                        <span className="text-red-600 font-medium">Belum TTD</span>
                      )}
                    </td>

                    <td className="p-2 border">{approvedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">

          {/* Jika semua sudah approve */}
          {allApproved && (
            <Button onClick={onUpdateStatus} className="bg-blue-600 text-white">
              Update Status
            </Button>
          )}

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}