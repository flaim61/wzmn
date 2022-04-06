import {FakeCtxMenu, FakeCtxMenuEventType, FakeCtxMenuItem} from "./FakeCtxMenu";
import browser from "webextension-polyfill";
import {presentHiddenChatsLeftDrawer} from "../LeftDrawerHiddenChats";
import {clearHiddenChats, getHiddenChats} from "../../Storage";
import {
  construct_smartMute_menu_item,
  toggleSmartMute,
} from "../../../features/user-can/SmartMute/SmartMute";
import {DOM} from "../../../../utility-belt/helpers/dom/DOM-shortcuts";
import {Selectors, StateItemNames, URLS} from "../../../data/dictionary";
import {set_el_style} from "../../../../utility-belt/helpers/dom/set-el-style";
import {remove_badge_el} from "../../../features/user-can/read-release-notes/remove-ver-num-badge";
import {set_extn_storage_item} from "../../../../utility-belt/helpers/extn/storage";
import {presentUnreadChats} from "../NavigationDrawer/UnreadChats";
import {getUnreadChats} from "../../ExtensionConnector";
import {logger} from "../../StorageLogger";
import {constructDebugModeMenuItem, toggleDebugMode} from "../MenuItems/debugMode";

export interface ZMCtxMenuItem extends FakeCtxMenuItem {
  makeAction?: () => void;
  children?: ZMCtxMenuItem[];
}

let ZMMenuItems: ZMCtxMenuItem[] = [
  {
    action: "smartMute",
    domNode: construct_smartMute_menu_item(),
    makeAction: toggleSmartMute,
  },
  {
    action: "hiddenChats",
    domNode: browser.i18n.getMessage("ZM_ctxMenuItem_hiddenChats"),
    makeAction: async () => presentHiddenChatsLeftDrawer(await getHiddenChats()),
  },
  {
    action: "unreadChats",
    domNode: browser.i18n.getMessage("ZM_ctxMenuItem_unreadChats"),
    makeAction: async () => getUnreadChats(presentUnreadChats),
  },
  {
    action: "unhideAll",
    domNode: browser.i18n.getMessage("ZM_ctxMenuItem_unhideAll"),
    makeAction: async () => {
      const hiddenChats = await getHiddenChats();
      browser.runtime.sendMessage({type: "deleteShedule", payload: {chat: hiddenChats}});
      clearHiddenChats();
    },
  },
  {
    action: "releaseNotes",
    domNode: browser.i18n.getMessage("ZM_ctxMenuItem_releaseNotes"),
    makeAction: () => {
      const releaseNotesAreaEl = DOM.get_el(Selectors.ZM_RELEASE_NOTES_AREA);
      set_el_style(releaseNotesAreaEl, {display: "initial"});

      remove_badge_el();

      set_extn_storage_item({[StateItemNames.RELEASE_NOTES_VIEWED]: true});
    },
  },
  {
    action: "sendFeedback",
    domNode: browser.i18n.getMessage("ZM_ctxMenuItem_contactUs"),
    makeAction: () => {
      const subject = "Zen Mode extension feedback";

      window.open(`${URLS.FEEDBACK_EMAIL}?subject=${subject}`);
    },
  },
  {
    action: "debugMode",
    domNode: constructDebugModeMenuItem(),
    makeAction: toggleDebugMode,
  },
];

export const debugModeItems = [
  {
    action: "getLog",
    domNode: "Copy extension log to clipboard",
    makeAction: async () => {
      const log = await logger.getLog();
      await navigator.clipboard.writeText(JSON.stringify(log));
      window.alert("Copied to clipboard");
    },
  },
  {
    action: "clearLog",
    domNode: "Clear extension log",
    makeAction: async () => {
      await logger.clearLog();
      window.alert("Extension log is cleared");
    },
  },
];

ZMMenuItems = [
  ...ZMMenuItems,
//   ...debugModeItems
];

export const debugModeActions = debugModeItems.map(it => it.action)

class ZMCtxMenu extends FakeCtxMenu {
  constructor(menuItems: ZMCtxMenuItem[]) {
    super("ZM", menuItems);
    // Initial render
    document.body.append(this._node!);
    // @ts-ignore
    this._node.addEventListener(
      "itemClick" as FakeCtxMenuEventType,
      this.handleItemClick,
    );
    // @ts-ignore
    this._node.addEventListener(
      "clickToEmptySpace" as FakeCtxMenuEventType,
      () => (this.isVisible = false),
    );
  }

  /**
   * Used to change chat by item click.
   */
  handleItemClick = (e: CustomEvent) => {
    const {item} = e.detail as {item: ZMCtxMenuItem};
    if (item.makeAction) {
      item.makeAction();
    }
    this.isVisible = false;
  };
}

export default new ZMCtxMenu(ZMMenuItems);
