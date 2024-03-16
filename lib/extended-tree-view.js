'use babel';

import _ from 'lodash';
import yo from 'yo-yo';
import { CompositeDisposable } from 'atom';
import { getRepositories } from './helpers';

export default class ExtendedTreeView {
  constructor(initialState = {}) {
    this.setState = this.setState.bind(this);
    this.render = this.render.bind(this);

    this.state = _.extend({
      activeItem: {},
      disableClosingItem: false,
      headerOnClick: (e) => {
        e.stopPropagation();
        this.setState({ expanded: !this.state.expanded });
      },
      title: 'Pane',
      expanded: true,
      items: [],
      repos: [],
      virtualRepo: false,
    }, initialState);

    this.selectedEntries = [];

    this.render();

    this.gitSubs = new CompositeDisposable();
    getRepositories().then(repos => {
      for (const repo of repos) {
        this.gitSubs.add(repo.onDidChangeStatus(this.render));
      }
      this.setState({ repos });
    });
  }

  destroy() {
    this.gitSubs.dispose();
    this.element.remove();
    this.state = null;
  }

  setState(state = {}, cb = _.noop) {
    _.extend(this.state, state);
    this.render();

    if (this.itemSubs) {
      this.itemSubs.dispose();
    }
    this.itemSubs = new CompositeDisposable();
    for (const item of this.state.items) {
      if (item.onDidChangeTitle != null) {
        this.itemSubs.add(item.onDidChangeTitle(this.render));
      }
      if (item.onDidChangeModified != null) {
        this.itemSubs.add(item.onDidChangeModified(this.render));
      }
    }

    cb();
  }

  deselect (deselectList) {
      deselectList.forEach((item, i) => {
          item.classList.remove('selected');
          const index = this.selectedEntries.indexOf(item);
          this.selectedEntries.splice(index, 1);
      });
  };

  select (item) {
      this.deselect(this.selectedEntries);
      if (!(item in this.selectedEntries)) {
          this.selectedEntries.push(item);
          item.classList.add('selected');
      }
  };

  renderItem(item) {
      const {
        activeItem,
        disableClosingItem,
        // title,
        headerOnClick,
        expanded,
        // items,
        repos,
        virtualRepo,
      } = this.state;

      let path = '';
      let title = '';
      let iconKlass = '';
      let isDirectory = false;
      if (typeof item === 'string') {
          path = "invalid"
          title = item;
          iconKlass = 'file-text';

          if (item.endsWith('/')) {
              iconKlass = 'file-directory'
              isDirectory = true;
          }

      } else {
          if ('dirname' in item) {
              path = 'invalid'
              title = item.dirname
              iconKlass = 'file-directory'
              isDirectory = true

          } else if ('name' in item) {
              path = `atom://teletype/portal/PORTAL-UUID-FOO/kindly-open/${item.fullname}`
              title = item.name
              iconKlass = 'file-text'
              isDirectory = false

          } else {

              //  -- real pane thingy
              if (item.getPath) {
                  path = item.getPath();
              } else if (item.uri) {
                  path = item.uri;
              }
              title = item.getTitle ? item.getTitle() : '';
              iconKlass = item.getIconName ? item.getIconName() : 'file-text';
              //  -- real pane thingy
          }
      }

      let containerClasses = item === activeItem ? 'extended-selected' : '';
      if (item.isModified != null) {
        containerClasses += item.isModified() ? ' modified' : '';
      }

      for (const repo of repos) {
        if (repo.isPathModified(path)) {
          containerClasses += ' status-modified';
        }
        if (repo.isPathNew(path)) {
          containerClasses += ' status-added';
        }
        if (repo.isPathIgnored(path)) {
          containerClasses += ' status-ignored';
        }
      }

      const openItem = (e) => {
        e.stopPropagation();
        const pane = atom.workspace.paneForItem(item);
        if (pane) {
          pane.activateItem(item);
          return;
        }
        atom.workspace.open(path)
      };
      const closeItem = disableClosingItem ? _.noop : (e) => {
        e.stopPropagation();
        atom.workspace.paneForItem(item).destroyItem(item)
      };

      const openFile = (e) => {
        e.stopPropagation();
        const target = e.currentTarget;
        this.select(target.parentNode);
        // would you kindly open the remote buffer/editor?
        // TODO: actually do stuff
        console.log(target);
        console.log(target.dataset.path);
        const askPath = target.dataset.path.replace(/^(atom:\/\/teletype\/portal\/PORTAL-UUID-FOO\/kindly-open\/)/,"");
        console.log(askPath);

        this.state.requestHostFileCallback(askPath);

      }

      const toggleExpand = (e) => {
        e.stopPropagation();
        // atom.workspace.paneForItem(item).destroyItem(item)
        // let target = e.target;
        // let target = e.currentTarget;
        let target = e.currentTarget.parentElement;
        console.log("trying to toggle folder");
        if (target.classList.contains("expanded")) {
            target.classList.remove('expanded')
            target.classList.add('collapsed')
        } else {
            target.classList.remove('collapsed')
            target.classList.add('expanded')
        }
        this.select(target);
        console.log(this.selectedEntries);
        // target.classList.add('selected')
      };

      // <li class="directory list-nested-item ${containerClasses} " is="tree-view-directory" onclick=${openItem}>
      if (isDirectory) {
          // <li class="directory /*entry*/ list-nested-item ${containerClasses} collapsed" is="tree-view-directory" onclick="${toggleExpand}">
          return yo`
            <li class="directory /*entry*/ list-nested-item ${containerClasses} collapsed" is="tree-view-directory">
                <div class="header list-item" onclick=${toggleExpand}>
                    <span class="name icon icon-${iconKlass}" data-path="${path}" data-name="${title}">
                    ${title}
                    </span>
                </div>
                <ol class="entries list-tree">
                    ${isDirectory ? item.treelist.map(inner_item => this.renderItem(inner_item)) : ''}
                </ol>
            </li>
          `;
      } else {
          // this is a 'file', can be binary though
          return yo`
            <li class="directory list-nested-item ${containerClasses} " is="tree-view-directory" >
                <span class="name icon icon-${iconKlass}" data-path="${path}" data-name="${title}" onclick="${openFile}">
                ${title}
                </span>
                <ol class="entries list-tree">
                    ${isDirectory ? item.treelist.map(inner_item => this.renderItem(inner_item)) : ''}
                </ol>
            </li>
          `;
      }
  }


  render() {
    const {
      activeItem,
      disableClosingItem,
      title,
      headerOnClick,
      expanded,
      items,
      repos,
      virtualRepo,
    } = this.state;

    // const element = yo`
    //   <li class="list-nested-item ${expanded ? 'expanded' : 'collapsed'}">
    //     <div class="header list-item" onclick=${headerOnClick}>
    //       <span class="name icon icon-${virtualRepo ? 'repo' : 'file-directory'}">${title}</span>
    //     </div>
    //     <ol class="entries list-tree">
    //       ${items.map(item => {
    //         return this.renderItem(item);
    //       })}
    //     </ol>
    //   </li>
    // `;
    const element = yo`
      <li class="directory list-nested-item project-root expanded">
        <div class="header list-item" onclick=${headerOnClick}>
          <span class="name icon icon-${virtualRepo ? 'repo' : 'file-directory'}">${title}</span>
        </div>
        <ol class="entries list-tree">
          ${items.map(item => {
            return this.renderItem(item);
          })}
        </ol>
      </li>
    `;

    if (!this.element) {
      this.element = element;
    }

    yo.update(this.element, element);

    return this.element;
  }
}
