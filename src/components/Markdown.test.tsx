import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from './Markdown';

describe('Markdown seguro', () => {
  it('preserva whitespace em blocos e representa títulos e listas semanticamente', () => {
    const html = renderToStaticMarkup(<Markdown text={'# Título\n- item\n```js\n  a\n    b\n```'} />);
    expect(html).toContain('<h2>Título</h2>');
    expect(html).toContain('<ul><li>item</li></ul>');
    expect(html).toContain('<code>  a\n    b</code>');
  });
  it('escapa HTML e não cria links javascript', () => {
    const html = renderToStaticMarkup(<Markdown text={'<script>alert(1)</script> [ruim](javascript:alert(1)) [bom](https://example.org)'} />);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.org"');
  });
});
