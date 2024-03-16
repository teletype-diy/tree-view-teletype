'use babel';

import { CompositeDisposable } from 'atom';
import ExtendedTreeView from './extended-tree-view';

export default class TeletypeFilesPaneView {
  constructor(itemList, requestHostFileCallback) {
    this.extendedTreeView = new ExtendedTreeView({
      // activeItem: itemList[0],
      title: 'Teletype Files',
      items: itemList,
      disableClosingItem: true,
      virtualRepo: true,
      requestHostFileCallback: requestHostFileCallback
    });

    // this.setPane(pane);
  }

  get element() {
    return this.extendedTreeView.element;
  }

  destroy() {
    this.extendedTreeView.destroy();
    this.paneSub.dispose();
    this.extendedTreeView = null;
  }

  // setPane(pane) {
  //   if (this.paneSub) {
  //     this.paneSub.dispose();
  //   }
  //
  //   this.paneSub = new CompositeDisposable();
	// 	this.pane = pane;
  //
  //   this.paneSub.add(atom.workspace.getCenter().observeActivePaneItem(activeItem => {
  //     this.extendedTreeView.setState({ activeItem });
  //   }))
  //
  //   const updateItems = () => this.extendedTreeView.setState({ items: this.pane.getItems() });
  //   this.paneSub.add(pane.onDidAddItem(updateItems));
  //   this.paneSub.add(pane.onDidMoveItem(updateItems));
  //   this.paneSub.add(pane.onDidRemoveItem(updateItems));
  //   this.paneSub.add(pane.onDidDestroy(() => this.paneSub.dispose()));
	// }
}
