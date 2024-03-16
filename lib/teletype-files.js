'use babel';

import { CompositeDisposable } from 'atom';
import ExtendedBase from './extended-base';
import TeletypeFilesPaneView from './teletype-files-pane-view';

export default class TeletypeFilesView extends ExtendedBase {
    constructor() {
        super();

        this.dockTitle = 'Teletype Files';

        this.paneViews = [];
        this.paneSubs = new CompositeDisposable();
        // this.paneSubs.add(
        //     atom.workspace.getCenter().observePanes(this.addPane.bind(this))
        // );
    }

    // Tear down any state and detach
    destroy() {
        super.destroy();
        this.paneSubs.dispose();
    }

    setTeletypeService(teletypeService) {
        // TODO: this never works: there is no data channel ready when starting.
        //       best to fix this inside teletype, make nicer API.
        this.teletypeService = teletypeService
        // TODO: disposeable needs work...
        // let channelDisposeable =
        this.teletypeService.subscribeToDataChannel(
            {
                channelName: 'tree-view/tree-update',
                callback: (body) => {
                    this.updateTeletypeTree(JSON.parse(body.body.toString()))
                }
            }).then((channelDisposeable) => {
                console.log("channelDisposeable:");
                console.log(channelDisposeable);
                if (channelDisposeable) {
                    this.paneSubs.add(
                        channelDisposeable
                    )
                }
            });
    }

    updateTeletypeTree(stateUpdate) {
        // TODO: do something with update
        console.log(stateUpdate);

        const lex_compare = (a, b) => {
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            // names must be equal
            return 0;
        }
        const dir_rec_sort = (a, b) => {
            let a_file = 'name' in a;
            let b_file = 'name' in b;
            if (a_file && b_file) {
                return lex_compare(a.name, b.name)
            }
            if (!a_file) {
                a.treelist.sort((ta, tb) => dir_rec_sort(ta, tb))
                if (!b_file) {
                    b.treelist.sort((ta, tb) => dir_rec_sort(ta, tb))
                    return lex_compare(a.dirname, b.dirname)
                } else {
                    return -1;
                }
            } else {
                b.treelist.sort((ta, tb) => dir_rec_sort(ta, tb))
                return 1;
            }
        }

        // const paneView = new TeletypeFilesPaneView(something)
        const paneView = new TeletypeFilesPaneView(stateUpdate.sort(
            (a, b) => dir_rec_sort(a, b)
        ));
        // ).slice(0, 10));
        // const paneView = new TeletypeFilesPaneView(stateUpdate);
        console.log("try to add view to paneviews");
        console.log(paneView);
        this.paneViews.push(paneView);
        console.log("try to append child to DOM");
        console.log(paneView.element);
        this.element.appendChild(paneView.element);
    }

  addPane(pane) {
    this.syncPanes();

    const paneView = new TeletypeFilesPaneView(pane);
    this.paneViews.push(paneView);
    this.element.appendChild(paneView.element);

    const destroySub = pane.onDidDestroy(() => {
      destroySub.dispose();
      this.removePane(pane);
    });

    this.paneSubs.add(destroySub);
  }

    // When a user is switching project folders (usually with project manager)
    // panes are added and removed.
    // This file syncs the views against what panes are currently displayed.
    syncPanes() {
        const currentPanes = atom.workspace.getCenter().getPanes();
        // Use slice to create a copy of paneViews as we mutate that array.
        this.paneViews.slice().forEach(view => {
            const currentPaneIndex = currentPanes.indexOf(view.pane);
            const currentPane = currentPanes[currentPaneIndex];
            if (currentPaneIndex === -1 ||
              currentPane.activeItem !== view.pane.activeItem) {
            this.removePane(view.pane);
            }
        });
    }

    removePane(pane) {
        const index = this.paneViews.findIndex(view => view.pane === pane);
        if (index === -1) {
            return;
        }
        this.paneViews[index].destroy();
        this.paneViews.splice(index, 1);
    }
}
