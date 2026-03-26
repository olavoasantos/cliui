import {bench, describe} from 'vitest';

import {Window} from '../Window';

function populateDocument(document: Window['document'], sectionCount: number, itemsPerSection: number): void {
  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const section = document.createElement('section');
    section.className = `section section-${sectionIndex}`;
    section.setAttribute('data-kind', sectionIndex % 2 === 0 ? 'even' : 'odd');

    const heading = document.createElement('h2');
    heading.className = 'title';
    heading.textContent = `Section ${sectionIndex}`;
    section.appendChild(heading);

    for (let itemIndex = 0; itemIndex < itemsPerSection; itemIndex += 1) {
      const article = document.createElement('article');
      article.className = `card card-${itemIndex}`;
      article.setAttribute('data-index', String(itemIndex));
      article.innerHTML = `<p>Item ${sectionIndex}-${itemIndex}</p><span class="badge">ready</span>`;
      section.appendChild(article);
    }

    document.body.appendChild(section);
  }
}

const typicalDocument = new Window().document;
populateDocument(typicalDocument, 12, 10);

const largeDocument = new Window().document;
populateDocument(largeDocument, 24, 16);

describe('Document', () => {
  bench('queries and serializes a typical document tree', () => {
    typicalDocument.querySelectorAll('.card .badge');
    typicalDocument.querySelector('[data-kind="odd"] .title');
    typicalDocument.body.outerHTML;
  });

  bench('queries and serializes a large document tree', () => {
    largeDocument.querySelectorAll('.card .badge');
    largeDocument.querySelector('[data-kind="odd"] .title');
    largeDocument.body.outerHTML;
  });
});
