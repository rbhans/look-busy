package com.qag.lookBusy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.baja.nre.annotations.NiagaraType;
import javax.baja.nre.annotations.NoSlotomatic;
import javax.baja.sys.Action;
import javax.baja.sys.BComponent;
import javax.baja.sys.BString;
import javax.baja.sys.Context;
import javax.baja.sys.Flags;
import javax.baja.sys.Property;
import javax.baja.sys.Sys;
import javax.baja.sys.Type;

/**
 * Station-wide scoreboards for the lookBusy games. Its Look Busy view is the
 * game menu; Px game widgets save here when their lookBusyOrd points at it.
 *
 * Each board keeps the top ten runs, best first, as readable text:
 * "value user yyyy-mm-dd | value user yyyy-mm-dd ...". Times are seconds.
 * Widgets add runs through the hidden operator action submitScore, so the
 * merge happens here, one at a time, with the user taken from the session.
 */
@NiagaraType
@NoSlotomatic
public class BLookBusy extends BComponent
{
  public static final Property ductRunScores = newProperty(Flags.READONLY, "");
  public String getDuctRunScores() { return getString(ductRunScores); }
  public void setDuctRunScores(String value) { setString(ductRunScores, value, null); }

  public static final Property tonnageScores = newProperty(Flags.READONLY, "");
  public String getTonnageScores() { return getString(tonnageScores); }
  public void setTonnageScores(String value) { setString(tonnageScores, value, null); }

  public static final Property faultsBeginnerScores = newProperty(Flags.READONLY, "");
  public String getFaultsBeginnerScores() { return getString(faultsBeginnerScores); }
  public void setFaultsBeginnerScores(String value) { setString(faultsBeginnerScores, value, null); }

  public static final Property faultsIntermediateScores = newProperty(Flags.READONLY, "");
  public String getFaultsIntermediateScores() { return getString(faultsIntermediateScores); }
  public void setFaultsIntermediateScores(String value) { setString(faultsIntermediateScores, value, null); }

  public static final Property pipeFitterScores = newProperty(Flags.READONLY, "");
  public String getPipeFitterScores() { return getString(pipeFitterScores); }
  public void setPipeFitterScores(String value) { setString(pipeFitterScores, value, null); }

  public static final Property sequenceScores = newProperty(Flags.READONLY, "");
  public String getSequenceScores() { return getString(sequenceScores); }
  public void setSequenceScores(String value) { setString(sequenceScores, value, null); }

  public static final Property afterHoursScores = newProperty(Flags.READONLY, "");
  public String getAfterHoursScores() { return getString(afterHoursScores); }
  public void setAfterHoursScores(String value) { setString(afterHoursScores, value, null); }

  public static final Property panelBuildScores = newProperty(Flags.READONLY, "");
  public String getPanelBuildScores() { return getString(panelBuildScores); }
  public void setPanelBuildScores(String value) { setString(panelBuildScores, value, null); }

  public static final Property damperDashScores = newProperty(Flags.READONLY, "");
  public String getDamperDashScores() { return getString(damperDashScores); }
  public void setDamperDashScores(String value) { setString(damperDashScores, value, null); }

  /** Argument "board:value", e.g. "ductRun:12"; returns the 1-based rank, or "" when it didn't place. */
  public static final Action submitScore = newAction(Flags.OPERATOR | Flags.HIDDEN | Flags.NO_AUDIT, BString.DEFAULT, null);
  public BString submitScore(BString arg) { return (BString)invoke(submitScore, arg, null); }

  public static final Action resetScores = newAction(Flags.CONFIRM_REQUIRED);
  public void resetScores() { invoke(resetScores, null, null); }

  @Override
  public Type getType() { return TYPE; }
  public static final Type TYPE = Sys.loadType(BLookBusy.class);

  private static final int SIZE = 10;
  private static final int MAX_VALUE = 10000000;
  private static final Pattern ENTRY = Pattern.compile("^(\\d+) (.+) (\\d{4}-\\d{2}-\\d{2})$");

  private final Object scoresLock = new Object();

  public BString doSubmitScore(BString arg, Context cx)
  {
    String text = arg.getString();
    int colon = text.indexOf(':');
    if (colon < 0) throw new IllegalArgumentException("Expected board:value");
    String board = text.substring(0, colon);
    Property prop = boardProperty(board);
    if (prop == null) throw new IllegalArgumentException("Unknown board: " + board);
    int value;
    try { value = Integer.parseInt(text.substring(colon + 1).trim()); }
    catch (NumberFormatException e) { throw new IllegalArgumentException("Score is not a whole number"); }
    if (value <= 0 || value > MAX_VALUE) throw new IllegalArgumentException("Score out of range");

    String user = cx != null && cx.getUser() != null ? cx.getUser().getUsername() : "";
    user = user == null ? "" : user.replace('|', '/').trim();
    if (user.isEmpty()) user = "station";
    boolean lowerIsBetter = isLowerBetter(board);

    synchronized (scoresLock)
    {
      List<String[]> rows = decode(getString(prop));
      int rank = 0;
      // Ties keep the earlier run ahead.
      while (rank < rows.size() && !better(value, Integer.parseInt(rows.get(rank)[0]), lowerIsBetter)) rank++;
      if (rank >= SIZE) return BString.make("");
      rows.add(rank, new String[] { Integer.toString(value), user, LocalDate.now().toString() });
      while (rows.size() > SIZE) rows.remove(rows.size() - 1);
      setString(prop, encode(rows), null);
      return BString.make(Integer.toString(rank + 1));
    }
  }

  public void doResetScores()
  {
    synchronized (scoresLock)
    {
      setString(ductRunScores, "", null);
      setString(tonnageScores, "", null);
      setString(faultsBeginnerScores, "", null);
      setString(faultsIntermediateScores, "", null);
      setString(pipeFitterScores, "", null);
      setString(sequenceScores, "", null);
      setString(afterHoursScores, "", null);
      setString(panelBuildScores, "", null);
      setString(damperDashScores, "", null);
    }
  }

  private static Property boardProperty(String board)
  {
    switch (board)
    {
      case "ductRun": return ductRunScores;
      case "tonnage": return tonnageScores;
      case "faultsBeginner": return faultsBeginnerScores;
      case "faultsIntermediate": return faultsIntermediateScores;
      case "pipeFitter": return pipeFitterScores;
      case "sequence": return sequenceScores;
      case "afterHours": return afterHoursScores;
      case "panelBuild": return panelBuildScores;
      case "damperDash": return damperDashScores;
      default: return null;
    }
  }

  /** Timed boards rank the fastest run first. */
  private static boolean isLowerBetter(String board)
  {
    return board.startsWith("faults") || board.equals("pipeFitter") || board.equals("afterHours");
  }

  private static boolean better(int value, int other, boolean lowerIsBetter)
  {
    return lowerIsBetter ? value < other : value > other;
  }

  private static List<String[]> decode(String text)
  {
    List<String[]> rows = new ArrayList<>();
    for (String part : text.split("\\|"))
    {
      Matcher m = ENTRY.matcher(part.trim());
      if (!m.matches() || m.group(1).length() > 9) continue;
      rows.add(new String[] { m.group(1), m.group(2), m.group(3) });
    }
    return rows;
  }

  private static String encode(List<String[]> rows)
  {
    StringBuilder sb = new StringBuilder();
    for (String[] row : rows)
    {
      if (sb.length() > 0) sb.append(" | ");
      sb.append(row[0]).append(' ').append(row[1]).append(' ').append(row[2]);
    }
    return sb.toString();
  }
}
