/// <reference path="./types/build-mode.d.ts" />

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class SnappaExtension extends Extension {
  enable() {
    console.log('[Snappa] Extension enabled');
  }

  disable() {
    console.log('[Snappa] Extension disabled');
  }
}
