import Swal from "sweetalert2";

export function showSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: "تم بنجاح",
    text: message,
    confirmButtonText: "حسنًا",
  });
}

export function confirmAction(message, confirmText = "تأكيد") {
  return Swal.fire({
    icon: "warning",
    title: "هل أنت متأكد؟",
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "إلغاء",
    reverseButtons: true,
  });
}
