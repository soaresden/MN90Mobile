package fr.soaresden.mn90wear;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * MN90 Montre : une question, une réponse. Interface native (pas de WebView, absente
 * de la plupart des montres Wear OS). Calculs : Mn90.java, table : assets/mn90.json.
 */
public class MainActivity extends Activity {

    // Couleurs (écran OLED : fond noir)
    static final int BG = 0xFF000000, CARD = 0xFF12202E, LINE = 0xFF24394F, TEXT = 0xFFF2F7FB,
            MUTED = 0xFFA9BCCC, ACCENT = 0xFF22D3EE, DANGER = 0xFFF87171, WARN = 0xFFFBBF24;

    static int stopColor(int d) {
        switch (d) {
            case 3: return 0xFF4ADE80;
            case 6: return 0xFFFB923C;
            case 9: return 0xFF22D3EE;
            case 12: return 0xFFA78BFA;
            default: return 0xFFF472B6;
        }
    }

    // Champs réglables : clé, libellé, pas, min, max, défaut
    static final String[][] FIELDS = {
            {"depth", "Profondeur", "1", "6", "60", "20"},
            {"time", "Durée", "1", "1", "120", "30"},
            {"o2", "Mélange", "1", "21", "100", "21"},
            {"pmax", "PpO₂ max", "0.1", "1.2", "1.6", "1.4"},
            {"tank", "Bloc", "1", "6", "24", "15"},
            {"press", "Pression", "10", "100", "300", "200"},
            {"sac", "Conso", "1", "10", "40", "20"},
            {"reserve", "Réserve", "10", "20", "100", "50"},
    };

    // Questions : identifiant, titre, champs
    static final String[][] QUESTIONS = {
            {"temps", "⏱️ Combien de temps je peux rester ?", "depth,o2"},
            {"paliers", "⬆️ Quels paliers ?", "depth,time,o2"},
            {"deco", "🔽 Quand je décolle du fond ?", "depth,time,o2"},
            {"mod", "🧪 Jusqu'où avec mon mélange ?", "o2,pmax"},
            {"mix", "🎯 Quel mélange pour ma profondeur ?", "depth,pmax"},
            {"urgence", "🚨 Remontée rapide : que faire ?", "depth,time,o2"},
            {"reglages", "⚙️ Mon matériel", "tank,press,sac,reserve"},
    };

    private Mn90 mn;
    private SharedPreferences prefs;
    private ScrollView scroll;
    private LinearLayout col;
    private LinearLayout result;
    private String current; // question affichée (null = liste)
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int padSide, padTop;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        prefs = getSharedPreferences("mn90", MODE_PRIVATE);

        int w = getResources().getDisplayMetrics().widthPixels;
        padSide = Math.round(w * 0.11f);
        padTop = Math.round(w * 0.13f);

        scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.setVerticalScrollBarEnabled(false);
        scroll.setFocusable(true);
        scroll.setFocusableInTouchMode(true);
        col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(padSide, padTop, padSide, Math.round(w * 0.24f));
        scroll.addView(col);
        setContentView(scroll);

        try {
            mn = new Mn90(readAsset("mn90.json"));
        } catch (Exception e) {
            col.addView(text("Table MN90 illisible : " + e.getMessage(), 14, DANGER, true));
            return;
        }
        String q = savedInstanceState != null ? savedInstanceState.getString("q") : null;
        if (q != null) showQuestion(q); else showHome();
    }

    @Override
    protected void onResume() {
        super.onResume();
        scroll.requestFocus(); // la couronne fait défiler
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        out.putString("q", current);
    }

    private String readAsset(String name) throws Exception {
        try (InputStream in = getAssets().open(name)) {
            byte[] buf = new byte[in.available()];
            int n = 0, r;
            while (n < buf.length && (r = in.read(buf, n, buf.length - n)) > 0) n += r;
            return new String(buf, 0, n, StandardCharsets.UTF_8);
        }
    }

    /** Numéro de version installé (à comparer avec celui affiché sur le site). */
    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "?";
        }
    }

    // ---------- Valeurs ----------
    private String[] field(String key) {
        for (String[] f : FIELDS) if (f[0].equals(key)) return f;
        throw new IllegalArgumentException(key);
    }

    private double val(String key) {
        return prefs.getFloat(key, Float.parseFloat(field(key)[5]));
    }

    private void bump(String key, int dir) {
        String[] f = field(key);
        double v = val(key) + dir * Double.parseDouble(f[2]);
        v = Math.round(v * 10) / 10.0;
        v = Math.max(Double.parseDouble(f[3]), Math.min(Double.parseDouble(f[4]), v));
        prefs.edit().putFloat(key, (float) v).apply();
    }

    private Mn90.Gear gear() {
        return new Mn90.Gear(val("tank"), val("press"), val("sac"), val("reserve"));
    }

    static String gasName(int o2) {
        return o2 <= 21 ? "Air" : o2 >= 100 ? "O₂ pur" : "Nx" + o2;
    }

    static String f1(double v) { return String.format(Locale.FRANCE, "%.1f", v); }

    private String show(String key) {
        double v = val(key);
        switch (key) {
            case "depth": return (int) v + " m";
            case "time": return (int) v + " min";
            case "o2": return gasName((int) v);
            case "pmax": return f1(v) + " b";
            case "tank": return (int) v + " L";
            case "sac": return (int) v + " L/min";
            default: return (int) v + " b";
        }
    }

    // ---------- Écrans ----------
    private void showHome() {
        current = null;
        col.removeAllViews();
        col.addView(text("🤿 MN90", 22, ACCENT, true));
        col.addView(text("Une question, une réponse", 13, MUTED, false));
        col.addView(text("v" + appVersion(), 12, MUTED, false));
        space(8);
        for (String[] q : QUESTIONS) {
            Button b = button(q[1], 14);
            b.setOnClickListener(v -> showQuestion(q[0]));
            col.addView(b);
            space(6);
        }
        scroll.scrollTo(0, 0);
    }

    private void showQuestion(String id) {
        String[] q = null;
        for (String[] x : QUESTIONS) if (x[0].equals(id)) q = x;
        if (q == null) { showHome(); return; }
        current = id;
        col.removeAllViews();
        TextView back = text("‹ Questions", 13, MUTED, false);
        back.setOnClickListener(v -> showHome());
        col.addView(back);
        col.addView(text(q[1], 16, TEXT, true));
        space(6);
        for (String key : q[2].split(",")) col.addView(stepper(key));
        result = new LinearLayout(this);
        result.setOrientation(LinearLayout.VERTICAL);
        col.addView(result);
        updateResult();
        scroll.scrollTo(0, 0);
    }

    private View stepper(String key) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setBackground(round(CARD, 0, 40));
        row.setPadding(dp(4), dp(4), dp(4), dp(4));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.bottomMargin = dp(6);
        row.setLayoutParams(lp);

        Button minus = roundButton("−");
        Button plus = roundButton("+");
        LinearLayout mid = new LinearLayout(this);
        mid.setOrientation(LinearLayout.VERTICAL);
        mid.setGravity(Gravity.CENTER);
        mid.addView(text(field(key)[1], 11, MUTED, false));
        TextView value = text(show(key), 20, TEXT, true);
        value.setTag("v-" + key);
        mid.addView(value);
        row.addView(minus);
        row.addView(mid, new LinearLayout.LayoutParams(0, -2, 1));
        row.addView(plus);
        repeat(minus, key, -1);
        repeat(plus, key, +1);
        return row;
    }

    /** Appui court : un pas ; appui long : défilement rapide. */
    private void repeat(Button b, String key, int dir) {
        final Runnable[] loop = new Runnable[1];
        loop[0] = () -> { bump(key, dir); refreshValues(); handler.postDelayed(loop[0], 90); };
        b.setOnTouchListener((v, ev) -> {
            switch (ev.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    v.setPressed(true);
                    bump(key, dir);
                    refreshValues();
                    handler.postDelayed(loop[0], 450);
                    return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    v.setPressed(false);
                    handler.removeCallbacks(loop[0]);
                    return true;
                default:
                    return true;
            }
        });
    }

    private void refreshValues() {
        for (String[] f : FIELDS) {
            View v = col.findViewWithTag("v-" + f[0]);
            if (v instanceof TextView) ((TextView) v).setText(show(f[0]));
        }
        updateResult();
    }

    // ---------- Résultats ----------
    private void updateResult() {
        if (result == null || current == null) return;
        result.removeAllViews();
        try {
            switch (current) {
                case "temps": resTemps(); break;
                case "paliers": resPaliers(); break;
                case "deco": resDeco(); break;
                case "mod": resMod(); break;
                case "mix": resMix(); break;
                case "urgence": resUrgence(); break;
                default: result.addView(note("Utilisé pour l'autonomie et le décollage.", MUTED));
            }
        } catch (Exception e) {
            result.addView(note("Calcul impossible : " + e.getMessage(), DANGER));
        }
    }

    private double fo2() { return val("o2") / 100.0; }

    private boolean modBlocked() {
        int o2 = (int) val("o2");
        double pmax = o2 > 21 ? val("pmax") : 1.6;
        double mod = Mn90.mod(fo2(), pmax);
        if (val("depth") > mod + 1e-9) {
            result.addView(note("⛔ " + gasName(o2) + " interdit à " + (int) val("depth") + " m (MOD " + f1(mod) + " m)", DANGER));
            return true;
        }
        return false;
    }

    private void resTemps() {
        modBlocked();
        Mn90.Limits l = mn.limits(val("depth"), fo2(), gear());
        if (l == null) { result.addView(note("Hors table", DANGER)); return; }
        LinearLayout two = new LinearLayout(this);
        two.setOrientation(LinearLayout.HORIZONTAL);
        two.addView(bigCard("Sans palier", l.maxNoStop + "′", ACCENT), new LinearLayout.LayoutParams(0, -2, 1));
        View gap = new View(this);
        two.addView(gap, new LinearLayout.LayoutParams(dp(6), 1));
        two.addView(bigCard("Maximum", l.max + "′", ACCENT), new LinearLayout.LayoutParams(0, -2, 1));
        result.addView(two);
        result.addView(note("Max limité par " + l.byMax + " · bloc " + (int) val("tank") + " L, " + (int) val("sac") + " L/min", MUTED));
    }

    private void resPaliers() {
        modBlocked();
        Mn90.Eval e = mn.square(val("depth"), val("time"), fo2(), gear());
        if (e.prof == null) { result.addView(note(e.tab.err, DANGER)); return; }
        LinearLayout c = card(ACCENT);
        c.addView(text("Paliers", 11, MUTED, false));
        c.addView(stops(e.tab.row.stop, 16));
        c.addView(text("DTR " + e.tab.row.dtr + "′  ·  GPS " + e.tab.row.gps, 15, TEXT, true));
        result.addView(c);
        String line = "Table " + e.tab.d + " m / " + e.tab.row.t + "′";
        if (e.nitrox) line += " (PEA " + f1(e.pea) + " m)";
        result.addView(note(line, MUTED));
    }

    private void resDeco() {
        Mn90.Gear g = gear();
        Mn90.Eval e = mn.square(val("depth"), val("time"), fo2(), g);
        if (e.prof == null) { result.addView(note(e.tab.err, DANGER)); return; }
        double[] d = Mn90.decollage(e, g);
        double pB = g.press - Mn90.gasUse(Mn90.square(val("depth"), val("time")), g.sac) / g.tank;
        boolean bad = pB < d[1];
        LinearLayout c = card(bad ? DANGER : ACCENT);
        c.addView(text("Décolle à", 11, MUTED, false));
        c.addView(text((int) d[0] + " b", 30, bad ? DANGER : ACCENT, true));
        c.addView(text("ou au bout de " + (int) val("time") + "′ au fond", 13, TEXT, false));
        result.addView(c);
        result.addView(note(bad ? "⛔ Tu n'auras que " + Math.round(pB) + " b au départ du fond : raccourcis"
                : "DTR " + e.tab.row.dtr + "′ · le premier des deux fait décoller", bad ? DANGER : MUTED));
    }

    private void resMod() {
        int o2 = (int) val("o2");
        double mod = Mn90.mod(fo2(), val("pmax"));
        LinearLayout c = card(ACCENT);
        c.addView(text("MOD " + gasName(o2), 11, MUTED, false));
        c.addView(text(f1(mod) + " m", 30, ACCENT, true));
        result.addView(c);
        result.addView(note("(" + f1(val("pmax")) + " / " + String.format(Locale.FRANCE, "%.2f", fo2()) + " − 1) × 10, arrondi vers le bas"
                + (o2 > 40 ? " · Nitrox Confirmé" : ""), MUTED));
    }

    private void resMix() {
        int b = Math.min(100, Mn90.bestMix(val("depth"), val("pmax")));
        LinearLayout c = card(ACCENT);
        c.addView(text("Best mix à " + (int) val("depth") + " m", 11, MUTED, false));
        c.addView(text(gasName(b), 30, ACCENT, true));
        result.addView(c);
        result.addView(note(f1(val("pmax")) + " / " + f1(Mn90.pabs(val("depth"))) + " b, arrondi vers le bas", MUTED));
    }

    private void resUrgence() {
        Mn90.Eval e = mn.square(val("depth"), val("time"), fo2(), gear());
        Mn90.Rapid r = e.prof != null ? mn.rapid(e) : null;
        if (r == null || r.tab.err != null) {
            result.addView(note("Oxygène, alerte 196 / 112, évacuation", DANGER));
            return;
        }
        LinearLayout c = card(WARN);
        c.addView(text("1. Moins de 3 min en surface, plongeur OK", 13, TEXT, false));
        String mid = r.mid == Math.floor(r.mid) ? String.valueOf((int) r.mid) : f1(r.mid);
        c.addView(text("2. Redescendre à " + mid + " m, 5 min", 14, TEXT, true));
        c.addView(text("3. Paliers :", 13, TEXT, false));
        c.addView(stops(r.stop, 15));
        result.addView(c);
        result.addView(note("Le moindre symptôme : O₂, 196 / 112", DANGER));
    }

    // ---------- Petits composants ----------
    private TextView stops(int[] stop, int sp) {
        SpannableStringBuilder sb = new SpannableStringBuilder();
        for (int d : Mn90.STOP_DEPTHS) {
            if (stop[d] <= 0) continue;
            if (sb.length() > 0) sb.append(" + ");
            int start = sb.length();
            sb.append(d + " m " + stop[d] + "′");
            sb.setSpan(new ForegroundColorSpan(stopColor(d)), start, sb.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        if (sb.length() == 0) sb.append("aucun palier");
        TextView t = text("", sp, TEXT, true);
        t.setText(sb);
        return t;
    }

    private LinearLayout bigCard(String label, String value, int color) {
        LinearLayout c = card(color);
        c.addView(text(label, 11, MUTED, false));
        c.addView(text(value, 26, color, true));
        return c;
    }

    private LinearLayout card(int border) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        c.setBackground(round(CARD, border, 24));
        c.setPadding(dp(8), dp(8), dp(8), dp(8));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = dp(6);
        c.setLayoutParams(lp);
        return c;
    }

    private TextView note(String s, int color) {
        TextView t = text(s, 12, color, color == DANGER);
        t.setPadding(0, dp(6), 0, 0);
        return t;
    }

    private TextView text(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(color);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setGravity(Gravity.CENTER_HORIZONTAL);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private Button button(String s, int sp) {
        Button b = new Button(this);
        b.setText(s);
        b.setAllCaps(false);
        b.setTextColor(TEXT);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        b.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        b.setBackground(round(CARD, 0, 40));
        b.setPadding(dp(14), dp(10), dp(14), dp(10));
        b.setLayoutParams(new LinearLayout.LayoutParams(-1, -2));
        return b;
    }

    private Button roundButton(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextColor(TEXT);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        b.setPadding(0, 0, 0, 0);
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(LINE);
        b.setBackground(d);
        b.setLayoutParams(new LinearLayout.LayoutParams(dp(44), dp(44)));
        return b;
    }

    private GradientDrawable round(int fill, int border, int radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(dp(radiusDp));
        if (border != 0) d.setStroke(dp(2), border);
        return d;
    }

    private void space(int dpH) {
        View v = new View(this);
        col.addView(v, new LinearLayout.LayoutParams(1, dp(dpH)));
    }

    private int dp(int v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    // ---------- Couronne et retour ----------
    @Override
    public boolean onGenericMotionEvent(MotionEvent ev) {
        if (ev.getAction() == MotionEvent.ACTION_SCROLL && ev.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            float delta = -ev.getAxisValue(MotionEvent.AXIS_SCROLL);
            scroll.smoothScrollBy(0, Math.round(delta * dp(48)));
            return true;
        }
        return super.onGenericMotionEvent(ev);
    }

    @Override
    public void onBackPressed() {
        if (current != null) showHome();
        else super.onBackPressed();
    }
}
