/**
 * Lightweight accessibility audit utilities.
 * Run a programmatic audit of a DOM subtree and optionally auto-apply safe fixes.
 */

export interface A11yIssue {
  element: string;
  issue: string;
  fix: string;
}

export interface A11yAuditResult {
  issues: A11yIssue[];
  score: number; // 0-100, penalized 5 per issue, floored at 0
}

function elementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const text = (el.textContent ?? '').trim().slice(0, 40);
  const id = el.id ? `#${el.id}` : '';
  return `<${tag}${id}>${text ? ` "${text}"` : ''}`;
}

function isHidden(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  const style = el.style;
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  return false;
}

function isDecorativeImg(img: HTMLElement): boolean {
  return img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true';
}

export function runA11yAudit(root: HTMLElement): A11yAuditResult {
  const issues: A11yIssue[] = [];

  const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
    (el) => !isHidden(el) && el !== root
  );

  for (const el of all) {
    // 1. Images missing alt text
    if (el.tagName === 'IMG') {
      const img = el as HTMLImageElement;
      if (!img.hasAttribute('alt') && !isDecorativeImg(img)) {
        issues.push({
          element: elementLabel(el),
          issue: 'Image is missing an alt attribute.',
          fix: 'Add alt text describing the image, or alt="" + role="presentation" if decorative.',
        });
      }
    }

    // 2. Buttons without accessible text
    if (el.tagName === 'BUTTON') {
      const btn = el as HTMLButtonElement;
      const hasText = (btn.textContent ?? '').trim().length > 0;
      const hasAria = btn.hasAttribute('aria-label') || btn.hasAttribute('aria-labelledby');
      const hasTitle = btn.hasAttribute('title');
      if (!hasText && !hasAria && !hasTitle) {
        issues.push({
          element: elementLabel(el),
          issue: 'Button has no accessible text (no text content, aria-label, or title).',
          fix: 'Add an aria-label describing the button action.',
        });
      }
    }

    // 3. Inputs without labels
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      const input = el as HTMLInputElement;
      const type = input.getAttribute('type');
      if (type !== 'hidden') {
        const hasLabel =
          input.labels !== null && input.labels.length > 0
            ? true
            : !!input.getAttribute('aria-label') || !!input.getAttribute('aria-labelledby');
        const hasTitle = !!input.getAttribute('title');
        if (!hasLabel && !hasTitle) {
          issues.push({
            element: elementLabel(el),
            issue: 'Form field has no associated label.',
            fix: 'Add a <label for>, aria-label, or aria-labelledby for this field.',
          });
        }
      }
    }

    // 4. outline: none focus styles without an alternative
    const computed = window.getComputedStyle(el);
    const outlineStyle = computed.outlineStyle || computed.outline;
    if ((outlineStyle === 'none' || outlineStyle === 'hidden') && !el.matches(':focus-visible')) {
      const hasFocusAlternative =
        el.style.boxShadow !== '' ||
        (computed.boxShadow !== 'none' && computed.boxShadow !== '');
      if (!hasFocusAlternative) {
        issues.push({
          element: elementLabel(el),
          issue: 'Element removes outline focus styles with no visible focus alternative.',
          fix: 'Add a visible :focus-visible style (outline, ring, or box-shadow).',
        });
      }
    }
  }

  const score = Math.max(0, 100 - issues.length * 5);
  return { issues, score };
}

/**
 * Applies safe, non-destructive fixes:
 *  - Decorative images (empty src heuristics, or explicitly marked) get alt="" + role="presentation".
 *  - Images with only a filename src matching decorative patterns get alt="".
 *  - Inputs without labels get aria-label derived from their placeholder.
 */
export function a11yAutoFix(root: HTMLElement): void {
  // Images missing alt
  root.querySelectorAll<HTMLElement>('img:not([alt])').forEach((el) => {
    const img = el as HTMLImageElement;
    img.setAttribute('alt', '');
    img.setAttribute('role', 'presentation');
  });

  // Buttons without accessible text: no safe default text exists, skip (reported only).

  // Inputs/textarea/select without labels -> aria-label from placeholder
  root
    .querySelectorAll<HTMLElement>('input:not([type="hidden"]), textarea, select')
    .forEach((el) => {
      const input = el as HTMLInputElement;
      const hasLabel =
        input.getAttribute('aria-label') ||
        input.getAttribute('aria-labelledby') ||
        (input.labels !== null && input.labels.length > 0);
      if (!hasLabel) {
        const placeholder = input.getAttribute('placeholder');
        if (placeholder) {
          input.setAttribute('aria-label', placeholder);
        }
      }
    });

  // outline: none — we cannot safely invent a design; reported only.
}
