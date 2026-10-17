/* Копирование ЧИСТОГО текста (UTF-8, без HTML/RTF-разметки).
   В Electron идём через IPC в главный процесс → clipboard.writeText,
   поэтому вставка в терминал не тянет за собой форматирование. */
export async function copyPlainText(text) {
  const value = String(text ?? '');
  try {
    if (window.gitDict?.copyText) return await window.gitDict.copyText(value);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* переходим к legacy-способу ниже */ }

  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
