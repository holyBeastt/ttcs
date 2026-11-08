window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "bai-bao-khoa-hoc",
    loaiNckh: "BAIBAO",
    label: "Bài báo khoa học",
    mode: "standard",
    hasSecondaryMembers: true,
    requiredTenTapChi: true,
  });

  // Xử lý upload dropzone cho bài báo khoa học
  const dropzone = document.querySelector(".upload-dropzone");
  const fileInput = document.getElementById("fileMinhChung");
  const displayEl = document.getElementById("fileSelectedName");

  if (dropzone && fileInput) {
    const allowedExtensions = [".pdf", ".doc", ".docx"];

    const validateAndShow = (file) => {
      if (!file) return;
      const fileName = file.name || "";
      const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        if (typeof Swal !== "undefined") {
          Swal.fire("Định dạng không hỗ trợ", "Chỉ chấp nhận file PDF, DOC hoặc DOCX.", "warning");
        } else {
          alert("Chỉ chấp nhận file PDF, DOC hoặc DOCX.");
        }
        fileInput.value = "";
        if (displayEl) displayEl.innerHTML = "";
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        if (typeof Swal !== "undefined") {
          Swal.fire("File quá lớn", "Dung lượng file tối đa là 25MB.", "warning");
        } else {
          alert("Dung lượng file tối đa là 25MB.");
        }
        fileInput.value = "";
        if (displayEl) displayEl.innerHTML = "";
        return;
      }

      if (displayEl) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        displayEl.innerHTML = `
          <div class="selected-file-badge" style="display:inline-flex;align-items:center;gap:8px;padding:4px 12px;background:#e8f4fd;border:1px solid #b6e0fe;border-radius:6px;color:#0c5460;font-size:0.875rem;">
            <i class="bi bi-file-earmark-check" style="font-size:1.1rem;color:#0d6efd;"></i>
            <span><strong>${fileName}</strong> (${sizeMb} MB)</span>
            <button type="button" class="btn-remove-selected-file" style="background:transparent;border:none;color:#dc3545;font-weight:bold;font-size:1.1rem;cursor:pointer;line-height:1;padding:0 0 0 6px;" title="Xóa file">&times;</button>
          </div>
        `;
        const removeBtn = displayEl.querySelector(".btn-remove-selected-file");
        if (removeBtn) {
          removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            fileInput.value = "";
            displayEl.innerHTML = "";
          });
        }
      }
    };

    fileInput.addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) {
        validateAndShow(e.target.files[0]);
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        validateAndShow(e.dataTransfer.files[0]);
      }
    });
  }
});
