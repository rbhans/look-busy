package com.qag.lookBusy.ux;

import javax.baja.naming.BOrd;
import javax.baja.nre.annotations.AgentOn;
import javax.baja.nre.annotations.NiagaraSingleton;
import javax.baja.nre.annotations.NiagaraType;
import javax.baja.nre.annotations.NoSlotomatic;
import javax.baja.sys.BSingleton;
import javax.baja.sys.Context;
import javax.baja.sys.Sys;
import javax.baja.sys.Type;
import javax.baja.web.BIFormFactorMax;
import javax.baja.web.js.BIJavaScript;
import javax.baja.web.js.JsInfo;

/** Game menu and scoreboards; view on a LookBusy component and a Px widget. */
@NiagaraType(agent = @AgentOn(types = "lookBusy:LookBusy"))
@NoSlotomatic
@NiagaraSingleton
public final class BLookBusyView
  extends BSingleton
  implements BIJavaScript, BIFormFactorMax
{
  public static final BLookBusyView INSTANCE = new BLookBusyView();

  private BLookBusyView() {}

  private static final JsInfo JS_INFO =
    JsInfo.make(BOrd.make("module://lookBusy/rc/LookBusyView.js"));

  @Override
  public Type getType()
  {
    return TYPE;
  }

  public static final Type TYPE = Sys.loadType(BLookBusyView.class);

  @Override
  public JsInfo getJsInfo(Context cx)
  {
    return JS_INFO;
  }
}
