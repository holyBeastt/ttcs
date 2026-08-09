'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.resolve(
    __dirname,
    '../../../src/public/js/vuotgio_v2/duyetKTHP/index.js'
);

const createElement = (tagName) => ({
    tagName: tagName.toUpperCase(),
    children: [],
    textContent: '',
    appendChild(child) {
        this.children.push(child);
        return child;
    },
});

describe('KTHP detail renderer', () => {
    it('renders imported values as text nodes instead of executable HTML', () => {
        const document = {
            addEventListener: jest.fn(),
            createElement,
            createTextNode: (text) => ({
                nodeType: 3,
                textContent: String(text),
            }),
        };
        const context = vm.createContext({
            console,
            document,
        });

        vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, {
            filename: scriptPath,
        });

        const cell = createElement('td');
        const maliciousValue = '<img src=x onerror="globalThis.pwned=true">';
        context.appendDetailParts(cell, [['Mã HP', maliciousValue]]);

        expect(cell.children).toHaveLength(2);
        expect(cell.children[0]).toEqual(expect.objectContaining({
            tagName: 'B',
            textContent: 'Mã HP:',
        }));
        expect(cell.children[1]).toEqual(expect.objectContaining({
            nodeType: 3,
            textContent: ` ${maliciousValue}`,
        }));
        expect(context.pwned).toBeUndefined();
    });
});
