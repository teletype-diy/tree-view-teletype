'use babel';

import { requirePackages } from 'atom-utils';

export default class ExtendedBase {
  constructor() {
    // Create root element
    // this.element = document.createElement('div');
    // this.element.classList.add('tree-view-extended');

    this.element = document.createElement('ol');
    this.element.classList.add('tree-view-root', 'full-menu', 'list-tree', 'has-collapsable-children', 'focusable-panel');
    // this.element.classList.add('tree-view-root');
    // this.element.classList.add('full-menu');
    // this.element.classList.add('list-tree');
    // this.element.classList.add('has-collapsable-children');
    // this.element.classList.add('focusable-panel');
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  isShowing() {
    return this.element.parentElement != null;
  }

	show() {
    requirePackages('tree-view').then(([treeView]) => {
      const parentElement = treeView.treeView.element.querySelector('li[is="tree-view-directory"]');
      parentElement.parentNode.parentNode.insertBefore(this.element, parentElement.parentNode.parentNode.firstChild)
		});
	}

  toggle() {
		if (this.isShowing()) {
			this.destroy();
		} else {
			this.show();
		}
	}
}
