/**
 * Pipe Fitter for Px pages. Set lookBusyOrd to a LookBusy component to share its
 * scoreboard on the station; without it scores stay in this browser.
 */
define(['nmodule/lookBusy/rc/LookBusyCore'], function (core) {
  'use strict';

  return class PipeFitterWidget extends core.GameWidget {
    constructor(params) {
      super(params);
      this.fixedGame = 'pipeFitter';
    }
  };
});
