import React, { useEffect } from "react";
import Swal from "sweetalert2";

/**
 * LeaveModal (SweetAlert2)
 *
 * Replaces the previous markup-based modal with a SweetAlert2 confirmation dialog.
 * Props:
 * - open: boolean            // when true the SweetAlert2 dialog will be shown
 * - onClose: () => void     // called when the user cancels / dismisses
 * - onConfirm: () => Promise|void // called when the user confirms (awaited if returns a Promise)
 *
 * Notes:
 * - The component returns null because SweetAlert2 handles the UI.
 * - When `open` becomes true we fire Swal.fire(). If the user confirms we await onConfirm()
 *   and do NOT call onClose afterwards (the original handler in your code already closes the modal
 *   in its finally block). If the user cancels/dismisses we call onClose().
 * - The dialog is non-closable by outside click (allowOutsideClick: false) to match the explicit
 *   confirmation behavior of the previous modal.
 */
export default function LeaveModal({ open, onClose, onConfirm }) {
  useEffect(() => {
    let active = true;
    if (!open) return;

    (async () => {
      const result = await Swal.fire({
        title: "Leave Class?",
        text: "Are you sure you want to leave this class? This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Leave",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        confirmButtonColor: "#e11d48", // red (Tailwind rose-600-like)
        cancelButtonColor: "#6b7280", // gray
        allowOutsideClick: false,
        allowEscapeKey: true,
      });

      if (!active) return;

      if (result.isConfirmed) {
        try {
          // If onConfirm returns a Promise (e.g., API call), await it so caller can manage loading state.
          await onConfirm();
        } catch (err) {
          // swallow here; caller's handler should handle errors (and show Swal/toast if needed)
          console.error("Error in onConfirm:", err);
        }
        // don't call onClose here — the original handler (handleLeaveClass) already sets the state/cleans up.
      } else {
        // User cancelled/dismissed
        if (typeof onClose === "function") onClose();
      }
    })();

    return () => {
      active = false;
      // Close any open Swal when component unmounts / effect cleanup
      try {
        Swal.close();
      } catch (e) {
        /* ignore */
      }
    };
  }, [open, onClose, onConfirm]);

  return null;
}