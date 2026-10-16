/**
 * Fault Finder for Px pages. Set lookBusyOrd to a LookBusy component to share its
 * scoreboard on the station; without it scores stay in this browser.
 */
define(['nmodule/lookBusy/rc/LookBusyCore'], function (core) {
  'use strict';

  return class MinesweeperWidget extends core.GameWidget {
    constructor(params) {
      super(params);
      this.fixedGame = 'faults';
    }
  };
});
