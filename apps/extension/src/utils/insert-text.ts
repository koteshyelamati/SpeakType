/**
 * Insert text at the caret position for input, textarea, and contenteditable elements.
 * Dispatches a single synthetic input event so one Ctrl+Z undoes the whole block.
 */

/**
 * Insert `text` at the current caret position of `target`.
 * Supports <input>, <textarea>, and contenteditable elements.
 */
export function insertTextAtCaret(target: HTMLElement, text: string): void {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    _insertIntoInput(target, text);
  } else if (target.isContentEditable) {
    _insertIntoContentEditable(target, text);
  }
}

function _insertIntoInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): void {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;

  // setRangeText replaces [start, end) and integrates with the native undo stack
  el.setRangeText(text, start, end, 'end');

  // One synthetic input event — a single Ctrl+Z will undo the whole inserted block
  el.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: false,
      inputType: 'insertText',
      data: text,
    }),
  );
}

function _insertIntoContentEditable(el: HTMLElement, text: string): void {
  el.focus();

  // After the (shadow-DOM) Accept button is clicked, the caret may no longer live
  // inside this element. Ensure a collapsed selection sits in `el` before insertion,
  // otherwise execCommand/Range would operate on the wrong context (or no-op).
  const sel = window.getSelection();
  const caretInEl =
    sel &&
    sel.rangeCount > 0 &&
    el.contains(sel.getRangeAt(0).commonAncestorContainer);
  if (sel && !caretInEl) {
    const caret = document.createRange();
    caret.selectNodeContents(el);
    caret.collapse(false); // place caret at the end of the field
    sel.removeAllRanges();
    sel.addRange(caret);
  }

  // execCommand('insertText') integrates with the browser's native undo stack (one-step undo)
  const success =
    typeof document.execCommand === 'function' &&
    document.execCommand('insertText', false, text);

  if (!success) {
    // Fallback: use Range insertion when execCommand is unavailable
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection — append to the end of the element
      el.textContent = (el.textContent ?? '') + text;
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Dispatch a single bubbling input event for framework reactivity
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        inputType: 'insertText',
        data: text,
      }),
    );
  }
}
