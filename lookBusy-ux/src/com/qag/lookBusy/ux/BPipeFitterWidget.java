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

/** Pipe Fitter game for Px pages. */
@NiagaraType
@NoSlotomatic
@NiagaraSingleton
public final class BPipeFitterWidget
  extends BSingleton
  implements BIJavaScript, BIFormFactorMax
{
  public static final BPipeFitterWidget INSTANCE = new BPipeFitterWidget();

  private BPipeFitterWidget() {}

  private static final JsInfo JS_INFO =
    JsInfo.make(BOrd.make("module://lookBusy/rc/PipeFitterWidget.js"));

  @Override
  public Type getType()
  {
    return TYPE;
  }

  public static final Type TYPE = Sys.loadType(BPipeFitterWidget.class);

  @Override
  public JsInfo getJsInfo(Context cx)
  {
    return JS_INFO;
  }
}
