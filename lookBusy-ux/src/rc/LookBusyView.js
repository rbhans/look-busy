/**
 * Look Busy game menu with the scoreboards. View on a LookBusy component;
 * on a Px page, set lookBusyOrd to a LookBusy to share its scoreboards.
 */
define(['nmodule/lookBusy/rc/LookBusyCore'], function (core) {
  'use strict';

  return class LookBusyView extends core.GameWidget {};
});
