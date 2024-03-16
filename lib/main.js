'use babel';

import { CompositeDisposable } from 'atom';
import OpenFiles from './open-files';
import GitModifiedFiles from './git-modified-files';
import TeletypeFiles from './teletype-files';

export default {
  config: {
  },

  activate(state) {
    this.openFiles = new OpenFiles();
    this.gitModifiedFiles = new GitModifiedFiles();
    this.teletypeFiles = new TeletypeFiles();

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Explicitly check if the values are not false so that we default to showing each view.

    // if (state.openFilesViewIsShowing !== false) {
    //   this.openFiles.show();
    // }
    // if (state.gitModifiedFilesViewIsShowing !== false) {
    //   this.gitModifiedFiles.show();
    // }
    if (state.teletypeFilesViewIsShowing !== false) {
        this.teletypeFiles.show();
    }

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tree-view-extended:toggle-all': () => {
        this.openFiles.toggle();
        this.gitModifiedFiles.toggle();
      },
      'tree-view-extended:show-all': () => {
        this.openFiles.show();
        this.gitModifiedFiles.show();
      },
      'tree-view-extended:hide-all': () => {
        this.openFiles.destroy();
        this.gitModifiedFiles.destroy();
      },

      'tree-view-extended:toggle-open-files': () => this.openFiles.toggle(),
      'tree-view-extended:show-open-files': () => this.openFiles.show(),
      'tree-view-extended:hide-open-files': () => this.openFiles.destroy(),

      'tree-view-extended:toggle-git-modified-files': () => this.gitModifiedFiles.toggle(),
      'tree-view-extended:show-git-modified-files': () => this.gitModifiedFiles.show(),
      'tree-view-extended:hide-git-modified-files': () => this.gitModifiedFiles.destroy(),

      'tree-view-extended:toggle-teletype': () => this.teletypeFiles.toggle(),

      'tree-view-extended:subscribe-to-teletype': () => this.teletypeFiles.subscribeToDataChannels(),

      'tree-view-extended:teletype-send-tree': () => this.sendProjectFolderToTeletype(),
    }));

    this.subscriptions.add(
      atom.workspace.onWillDestroyPaneItem(({ item }) => {
        if (item instanceof OpenFiles) {
          this.openFiles.destroy();
        }
        if (item instanceof GitModifiedFiles) {
          this.gitModifiedFiles.destroy();
        }
        if (item instanceof TeletypeFiles) {
          this.teletypeFiles.destroy();
        }
      })
    )
  },

  deactivate() {
    this.subscriptions.dispose();
    if (this.openFiles) {
      this.openFiles.destroy();
    }

    if (this.gitModifiedFiles) {
      this.gitModifiedFiles.destroy();
    }

    if (this.teletypeFiles) {
      this.teletypeFiles.destroy();
    }
  },

  serialize() {
    return {
      openFilesViewIsShowing: this.openFiles.isShowing(),
      gitModifiedFilesViewIsShowing: this.gitModifiedFiles.isShowing(),
      teletypeFilesViewIsShowing: this.teletypeFiles.isShowing(),
    };
  },

    consumeTeletype (teletypeService) {
        this.teletypeService = teletypeService
        if (this.teletypeFiles) this.teletypeFiles.setTeletypeService(teletypeService)
    },

    sendProjectFolderToTeletype() {
        const fs = require('fs')
        const rootPath = atom.project.getDirectories()[0].path
        let rootDir = fs.readdirSync(rootPath, {withFileTypes:true})
        let fileList = []
        const genFileList = (inList, inPath) => {
            let outList = []
            inList.forEach((item, i) => {
                if (item.isDirectory()) {
                    // recursive
                    const tmpDir = fs.readdirSync(rootPath+'/'+inPath+'/'+item.name, {withFileTypes:true})

                    const tmpList = genFileList(tmpDir, inPath+'/'+item.name)
                    // outList.push(inPath+'/'+item.name+'/')
                    // outList.push(...tmpList)
                    outList.push({
                        dirname: item.name,
                        fullname: inPath+'/'+item.name+'/',
                        treelist: tmpList
                    })
                } else {
                    // outList.push(inPath+'/'+item.name)
                    outList.push({name: item.name, fullname: inPath+'/'+item.name})
                }
            });
            return outList;
        }
        fileList = genFileList(rootDir, '.')
        // fileList = fileList.map((x) => x.substring(2))
        // TODO: this is crap.
        let repo = atom.project.getRepositories()[0];
        if (repo) {
            fileList = fileList.filter((testPath) => {
                // TODO: this does only work for project root...
                console.log(`testPath ${testPath.fullname}`);
                console.log(`ignored: ${repo.isPathIgnored(testPath.fullname.substring(2))}`);
                return !repo.isPathIgnored(testPath.fullname.substring(2));
            });
        }

        console.log(fileList);

        this.teletypeService.notifyOnDataChannel({channelName: "tree-view/tree-update", body: JSON.stringify(fileList)})
    },
};
