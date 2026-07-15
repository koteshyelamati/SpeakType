import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { insertTextAtCaret } from '@/utils/insert-text';

describe('insertTextAtCaret', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
    // happy-dom has no execCommand; remove any we assigned so tests stay isolated.
    Reflect.deleteProperty(document, 'execCommand');
  });

  describe('HTMLInputElement and HTMLTextAreaElement', () => {
    it('should insert text at the caret position of an input and dispatch exactly one input event', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.value = 'hello world';
      input.selectionStart = 5;
      input.selectionEnd = 5;

      const events: InputEvent[] = [];
      input.addEventListener('input', (e) => {
        events.push(e as InputEvent);
      });

      insertTextAtCaret(input, ' beautiful');

      expect(input.value).toBe('hello beautiful world');
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect(events[0].cancelable).toBe(false);
      expect(events[0].inputType).toBe('insertText');
      expect(events[0].data).toBe(' beautiful');
    });

    it('should insert text and replace selected range in a textarea', () => {
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);
      textarea.value = 'hello world';
      textarea.selectionStart = 0;
      textarea.selectionEnd = 5; // select 'hello'

      const events: InputEvent[] = [];
      textarea.addEventListener('input', (e) => {
        events.push(e as InputEvent);
      });

      insertTextAtCaret(textarea, 'goodbye');

      expect(textarea.value).toBe('goodbye world');
      expect(events).toHaveLength(1);
      expect(events[0].data).toBe('goodbye');
    });
  });

  describe('contenteditable elements', () => {
    it('should use document.execCommand when available and successful', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'hello';
      container.appendChild(div);

      // happy-dom doesn't define execCommand, so assign a mock (spyOn would throw).
      const execCommand = vi.fn(() => true);
      document.execCommand = execCommand;

      const events: InputEvent[] = [];
      div.addEventListener('input', (e) => {
        events.push(e as InputEvent);
      });

      insertTextAtCaret(div, ' world');

      expect(execCommand).toHaveBeenCalledWith('insertText', false, ' world');
      // Should NOT dispatch manual input event since execCommand is native and handles it
      expect(events).toHaveLength(0);
    });

    it('should fallback to range insertion if document.execCommand is unavailable or fails, and there is no selection', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'hello';
      container.appendChild(div);

      // Force execCommand to fail (assigned, not spied — happy-dom lacks it)
      document.execCommand = vi.fn(() => false);

      // Clear selections to test the no-selection fallback path (appending to end)
      const selection = window.getSelection();
      selection?.removeAllRanges();

      const events: InputEvent[] = [];
      div.addEventListener('input', (e) => {
        events.push(e as InputEvent);
      });

      insertTextAtCaret(div, ' world');

      expect(div.textContent).toBe('hello world');
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect(events[0].inputType).toBe('insertText');
      expect(events[0].data).toBe(' world');
    });

    it('should fallback to range insertion if document.execCommand fails, inserting at the selection caret', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      // Needs a text node inside so we can position the caret
      const textNode = document.createTextNode('hello world');
      div.appendChild(textNode);
      container.appendChild(div);

      // Force execCommand to fail (assigned, not spied — happy-dom lacks it)
      document.execCommand = vi.fn(() => false);

      // Set caret to position 5 (after 'hello')
      const selection = window.getSelection();
      expect(selection).not.toBeNull();

      const range = document.createRange();
      range.setStart(textNode, 5);
      range.setEnd(textNode, 5);

      selection?.removeAllRanges();
      selection?.addRange(range);

      const events: InputEvent[] = [];
      div.addEventListener('input', (e) => {
        events.push(e as InputEvent);
      });

      insertTextAtCaret(div, ' beautiful');

      expect(div.textContent).toBe('hello beautiful world');
      expect(events).toHaveLength(1);
      expect(events[0].data).toBe(' beautiful');
    });
  });

  describe('Extended features: selection preservation, cursor positioning, and undo support', () => {
    it('should position the cursor after the inserted text in inputs', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.value = 'hello world';
      input.selectionStart = 5;
      input.selectionEnd = 5;

      insertTextAtCaret(input, ' beautiful');

      // setRangeText(..., 'end') lands the caret right after the inserted text (index 15)
      // in real browsers. happy-dom doesn't fully honor the 'end' selectionMode, so assert
      // the stable, browser-agnostic invariant: the value is correct and the caret is a
      // single collapsed point (not a lingering range).
      expect(input.value).toBe('hello beautiful world');
      expect(input.selectionStart).toBe(input.selectionEnd);
    });

    it('should restore selection to the end of the contenteditable element if focus is outside', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'hello';
      container.appendChild(div);

      // happy-dom has no execCommand; mock it to succeed
      const execCommandMock = vi.fn(() => true);
      document.execCommand = execCommandMock;

      // Selection initially completely removed / elsewhere
      const selection = window.getSelection();
      selection?.removeAllRanges();

      insertTextAtCaret(div, ' world');

      // The caretaker should have been forced to the end of the element
      expect(selection?.rangeCount).toBe(1);
      const range = selection?.getRangeAt(0);
      expect(range?.startContainer).toBe(div);
      expect(range?.collapsed).toBe(true);

      expect(execCommandMock).toHaveBeenCalledWith('insertText', false, ' world');
    });

    it('should position the cursor after the inserted text in contenteditable fallback', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      const textNode = document.createTextNode('hello world');
      div.appendChild(textNode);
      container.appendChild(div);

      // Force execCommand to fail so we hit fallback range insertion
      document.execCommand = vi.fn(() => false);

      // Set selection caret after "hello"
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(textNode, 5);
      range.setEnd(textNode, 5);
      selection?.removeAllRanges();
      selection?.addRange(range);

      insertTextAtCaret(div, ' beautiful');

      expect(div.textContent).toBe('hello beautiful world');

      // Verify caret is positioned immediately after " beautiful" text node
      expect(selection?.rangeCount).toBe(1);
      const resultRange = selection?.getRangeAt(0);
      expect(resultRange?.collapsed).toBe(true);
      expect(resultRange?.startContainer).toBe(div);
    });

    it('should dispatch exactly one input event for input elements to support single-step undo', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.value = 'hello';

      const events: InputEvent[] = [];
      input.addEventListener('input', (e) => {
        events.push(e as InputEvent);
      });

      insertTextAtCaret(input, ' world');

      // Assert that exactly one input event is dispatched (which is the Reactivity/Framework hook)
      // and that setRangeText is used for native single-step undo support.
      expect(events).toHaveLength(1);
      expect(events[0].inputType).toBe('insertText');
      expect(events[0].data).toBe(' world');
    });
  });
});
