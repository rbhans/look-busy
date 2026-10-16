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

/** Sequence of Ops game for Px pages. */
@NiagaraType
@NoSlotomatic
@NiagaraSingleton
public final class BSequenceWidget
  extends BSingleton
  implements BIJavaScript, BIFormFactorMax
{
  public static final BSequenceWidget INSTANCE = new BSequenceWidget();

  private BSequenceWidget() {}

  private static final JsInfo JS_INFO =
    JsInfo.make(BOrd.make("module://lookBusy/rc/SequenceWidget.js"));

  @Override
  public Type getType()
  {
    return TYPE;
  }

  public static final Type TYPE = Sys.loadType(BSequenceWidget.class);

  @Override
  public JsInfo getJsInfo(Context cx)
  {
    return JS_INFO;
  }
}
