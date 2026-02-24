// ملف: toast.ts
// دالة بسيطة لعرض Toast احترافي بدون مكتبة خارجية (يمكنك استبدالها لاحقاً بمكتبة مثل react-hot-toast)

export function showToast(message: string, variant: 'success' | 'error' = 'success') {
  // تحقق إذا كان هناك Toast ظاهر مسبقاً
  if (document.getElementById('custom-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'custom-toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '32px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = variant === 'error' ? 'rgba(220,38,38,0.95)' : 'rgba(34,197,94,0.95)'; // أحمر أو أخضر
  toast.style.color = '#fff';
  toast.style.padding = '16px 32px';
  toast.style.borderRadius = '12px';
  toast.style.fontSize = '1rem';
  toast.style.fontWeight = 'bold';
  toast.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)';
  toast.style.zIndex = '9999';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';

  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
