import escape from 'lodash.escape';

const DATA_HIGHLIGHT_ATTRIBUTE = 'data-live-highlight';
const DATA_HIGHLIGHT_TARGET_ATTRIBUTE = 'data-live-highlight-target';

const TYPE_JAVASCRIPT = 'javascript';
const TYPE_STYLES = 'styles';
const TYPE_HTML = 'html';

function getElementType(element) {
    switch (element.nodeName) {
        case 'SCRIPT':
            return TYPE_JAVASCRIPT;
        case 'STYLE':
            return TYPE_STYLES;
        default:
            return TYPE_HTML;
    }
}

function getElementDepth(element) {
    let result = 0;
    while (element.parentElement) {
        element = element.parentElement;
        result++;
    }

    return result;
}

function getIsSelfTagIncluded(element) {
    const type = getElementType(element);
    return type === TYPE_HTML;
}

function getFormattedElementContent(originElement) {
    const isSelfTagIncluded = getIsSelfTagIncluded(originElement);

    let content = isSelfTagIncluded ? originElement.outerHTML : originElement.innerHTML;
    content = content.trim();
    content = escape(content);

    // browsers return innerHTML and outerHTML with original indents
    // it means that if html document is formatted with indents based on elements nesting
    // highlighted text will have redundant space at the beginning of every line
    // to avoid that we can check if formatting is applied and if so remove spaces based on the depth of the element within the document tree
    // assuming every level of depth adds 1 additional tab (or 4 spaces)
    const elementDepth = getElementDepth(originElement);
    // if we need to highlight not only content of the element but the element itself we should take it into account
    const tabsToRemove = isSelfTagIncluded ? elementDepth - 2 : elementDepth - 1;
    const spacesWithinTab = 4;
    const redundantSpaces = tabsToRemove * spacesWithinTab;
    content = content.replace(/(\n[\s]*)/g, (match, tabPrefix) => {
        if (tabPrefix.length > redundantSpaces) {
            tabPrefix = tabPrefix.substring(0, tabPrefix.length - redundantSpaces);
        }
        return tabPrefix;
    });

    return content;
}

function createHighlightedElement(originElement, target = null) {
    originElement.removeAttribute('data-highlight');
    const pre = document.createElement('pre');
    const code = document.createElement('code');

    code.innerHTML = getFormattedElementContent(originElement);

    pre.insertAdjacentElement('beforeend', code);
    if (target) {
        target.insertAdjacentElement('beforeend', pre);
    } else {
        originElement.insertAdjacentElement('afterend', pre);
    }

    return code;
}

function bootstrap(cb) {
    document.addEventListener('DOMContentLoaded', (event) => {
        [...document.querySelectorAll(`[${DATA_HIGHLIGHT_ATTRIBUTE}]`)].forEach((element) => {
            const targetId = element.getAttribute(DATA_HIGHLIGHT_ATTRIBUTE);
            let highlightedElement;

            if (targetId) {
                const targetElement = document.querySelector(`[${DATA_HIGHLIGHT_TARGET_ATTRIBUTE}="${targetId}"]`);
                if (targetElement) {
                    highlightedElement = createHighlightedElement(element, targetElement);
                } else {
                    console.error(`Cannot find target with id ${targetId}`);
                    return;
                }
            } else {
                highlightedElement = createHighlightedElement(element);
            }

            cb(highlightedElement, getElementType(element));
        })
    });
}

export {
    bootstrap,
    TYPE_JAVASCRIPT,
    TYPE_STYLES,
    TYPE_HTML
}