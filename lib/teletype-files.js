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

    requestHostToOpenFile(filename) {
        if (!this.teletypeService) return;
        // would you kindly share this file with us
        this.teletypeService.notifyOnDataChannel({
            channelName: 'tree-view/kindly-open',
            body: JSON.stringify({ filename: filename })
        })
        // would you kindly tell us how we can reach the new file
        console.log("debug get remoteEditors");
        let reply = async (filename) => {
            // lets try at most 3 times, because... why not?
            for (let i = 0; i < 3; i++) {
                // wait a bit, it is only polite to give them a little time to think
                await new Promise(r => setTimeout(r, 200));

                // look, I know, this part would be cleaner with an ack from host,
                // I will fix it if it fails frequently in practive,
                // so far seems to just be more complicated for no good reason -.-

                const remoteEditors = (this.teletypeService && await this.teletypeService.getRemoteEditors()) || []
                const remoteItems = remoteEditors.map((remoteEditor) => {
                    return {
                        uri: remoteEditor.uri,
                        filePath: remoteEditor.path,
                        label: `@${remoteEditor.hostGitHubUsername}: ${remoteEditor.path}`,
                        ownerGitHubUsername: remoteEditor.hostGitHubUsername
                    }
                })
                const needleRemoteItem = remoteItems.filter((item) => {
                    // TODO: this needs fixing if I ever fix the paths...
                    return '.'+item.filePath.substring(item.filePath.indexOf('/')) === filename;
                })
                console.log(remoteItems);
                console.log(needleRemoteItem);
                if (needleRemoteItem.length == 1) {
                    return needleRemoteItem[0];
                }
            }
            // TODO: we failed
            throw new Error("no such file, maybe host refused our request.")
        }
        reply(filename).then((remoteFile) => {
            // if we got an answer, we can just open it,
            console.log(remoteFile);
            // TODO: make it fancy...
            console.log(`trying to open ${remoteFile.uri}`);
            if (remoteFile.uri) {
                atom.workspace.open(remoteFile.uri)
            }
        });
        // const  this.teletypeService.getRemoteEditors()
    }

    setTeletypeService(teletypeService) {
        this.teletypeService = teletypeService
    }

    subscribeToDataChannels() {
        // TODO: this never works: there is no data channel ready when starting.
        //       best to fix this inside teletype, make nicer API.
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

        console.log("trying to subscribe to host data channel.");
        this.teletypeService.subscribeToHostDataChannel(
            {
                channelName: 'tree-view/kindly-open',
                callback: (body) => {
                    const filenameToOpen = JSON.parse(body.body.toString()).filename;
                    // TODO: ask the user if really want to open
                    //       just do it for now...
                    console.log(`guest requested to open ${filenameToOpen}`);
                    // TODO: sanitize filename, check against repo, only allow not-ignored files, etc...
                    atom.workspace.open(filenameToOpen)
                    // atom.workspace.open(uri, options)
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
        ), (filename) => {this.requestHostToOpenFile(filename);});
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
