package com.qag.lookBusy.ux;

import javax.baja.naming.BOrd;
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

/** Tonnage game for Px pages. */
@NiagaraType
@NoSlotomatic
@NiagaraSingleton
public final class BGame2048Widget
  extends BSingleton
  implements BIJavaScript, BIFormFactorMax
{
  public static final BGame2048Widget INSTANCE = new BGame2048Widget();

  private BGame2048Widget() {}

  private static final JsInfo JS_INFO =
    JsInfo.make(BOrd.make("module://lookBusy/rc/Game2048Widget.js"));

  @Override
  public Type getType()
  {
    return TYPE;
  }

  public static final Type TYPE = Sys.loadType(BGame2048Widget.class);

  @Override
  public JsInfo getJsInfo(Context cx)
  {
    return JS_INFO;
  }
}
