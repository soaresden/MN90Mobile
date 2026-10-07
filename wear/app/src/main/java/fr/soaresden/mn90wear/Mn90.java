package fr.soaresden.mn90wear;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.TreeMap;

/**
 * Calculs MN90 de la montre : portage Java de shared/mn90.js (mêmes règles).
 * La table est lue dans assets/mn90.json, généré à la compilation depuis shared/mn90.js.
 */
final class Mn90 {

    // Vitesses (m/min) et limites, identiques au site
    static final double DESC = 20, ASC = 15, ASC_STOP = 6;
    static final int IMMERSION = 120;
    static final double SNC_MAX = 80;
    static final double[][] NOAA = {{0.6, 720}, {0.7, 570}, {0.8, 450}, {0.9, 360}, {1.0, 300}, {1.1, 240},
            {1.2, 210}, {1.3, 180}, {1.4, 150}, {1.5, 120}, {1.6, 45}, {1.7, 10}, {1.8, 2}};
    static final int[] STOP_DEPTHS = {15, 12, 9, 6, 3};

    /** Ligne de table : durée, paliers (minutes par profondeur 15/12/9/6/3), DTR, GPS. */
    static final class Row {
        int t, dtr;
        String gps;
        final int[] stop = new int[16]; // index = profondeur du palier

        boolean hasStops() {
            for (int d : STOP_DEPTHS) if (stop[d] > 0) return true;
            return false;
        }
    }

    static final class Gear {
        double tank, press, sac, reserve;
        Gear(double tank, double press, double sac, double reserve) {
            this.tank = tank; this.press = press; this.sac = sac; this.reserve = reserve;
        }
    }

    static final class Lookup { int d; Row row; String err; }

    static final class Profile {
        final List<double[]> pts = new ArrayList<>();
        double total, bottomEnd;
    }

    static final class Eval {
        double depth, time, fo2, pea;
        boolean nitrox;
        Lookup tab;
        Profile prof;
        double left, gasL, snc, dtrReal;
    }

    private final TreeMap<Integer, List<Row>> table = new TreeMap<>();

    Mn90(String json) throws Exception {
        JSONObject root = new JSONObject(json);
        Iterator<String> keys = root.keys();
        while (keys.hasNext()) {
            String k = keys.next();
            JSONArray rows = root.getJSONArray(k);
            List<Row> list = new ArrayList<>();
            for (int i = 0; i < rows.length(); i++) {
                JSONArray a = rows.getJSONArray(i);
                Row r = new Row();
                r.t = a.getInt(0);
                JSONObject st = a.getJSONObject(1);
                Iterator<String> sk = st.keys();
                while (sk.hasNext()) { String s = sk.next(); r.stop[Integer.parseInt(s)] = st.getInt(s); }
                r.dtr = a.getInt(2);
                r.gps = a.getString(3);
                list.add(r);
            }
            table.put(Integer.parseInt(k), list);
        }
    }

    static double pabs(double z) { return z / 10 + 1; }
    static double pea(double depth, double fo2) { return (pabs(depth) * (1 - fo2) / 0.8 - 1) * 10; }
    static double mod(double fo2, double pmax) { return Math.floor((pmax / fo2 - 1) * 100 + 1e-6) / 10; }
    static int bestMix(double depth, double pmax) { return (int) Math.floor(pmax / pabs(depth) * 100 + 1e-6); }

    /** Profondeur et durée immédiatement supérieures, sans interpolation. */
    Lookup lookup(double depth, double time) {
        Lookup l = new Lookup();
        Integer d = table.ceilingKey((int) Math.ceil(depth - 1e-9));
        if (d == null) { l.err = "Hors table (> 65 m)"; return l; }
        l.d = d;
        for (Row r : table.get(d)) if (r.t >= time) { l.row = r; return l; }
        l.err = "Durée hors table à " + d + " m";
        return l;
    }

    static List<double[]> square(double depth, double time) {
        List<double[]> b = new ArrayList<>();
        b.add(new double[]{0, 0});
        b.add(new double[]{Math.min(depth / DESC, time), depth});
        b.add(new double[]{time, depth});
        return b;
    }

    /** Ajoute la remontée et les paliers après le départ du fond. */
    static Profile build(List<double[]> bottom, int[] stop) {
        Profile p = new Profile();
        for (double[] x : bottom) p.pts.add(new double[]{x[0], x[1]});
        double[] last = bottom.get(bottom.size() - 1);
        double t = last[0], z = last[1];
        p.bottomEnd = t;
        boolean first = true;
        for (int s : STOP_DEPTHS) {
            if (stop[s] <= 0) continue;
            if (s < z) { t += (z - s) / (first ? ASC : ASC_STOP); z = s; p.pts.add(new double[]{t, z}); }
            first = false;
            t += stop[s];
            p.pts.add(new double[]{t, z});
        }
        t += z / (first ? ASC : ASC_STOP);
        p.pts.add(new double[]{t, 0});
        p.total = t;
        return p;
    }

    static double gasUse(List<double[]> pts, double sac) {
        double L = 0;
        for (int i = 1; i < pts.size(); i++) {
            double[] a = pts.get(i - 1), b = pts.get(i);
            L += (b[0] - a[0]) * sac * ((a[1] + b[1]) / 20 + 1);
        }
        return L;
    }

    static double noaaLimit(double p) {
        for (double[] r : NOAA) if (r[0] >= p - 1e-9) return r[1];
        return 1;
    }

    static double snc(List<double[]> pts, double fo2) {
        double s = 0;
        for (int i = 1; i < pts.size(); i++) {
            double dt = pts.get(i)[0] - pts.get(i - 1)[0];
            if (dt <= 0) continue;
            double p = pabs((pts.get(i)[1] + pts.get(i - 1)[1]) / 2) * fo2;
            if (p >= 0.6) s += dt / noaaLimit(p) * 100;
        }
        return s;
    }

    Eval evaluate(List<double[]> bottom, double fo2, boolean nitrox, Gear g) {
        Eval e = new Eval();
        double depth = 0;
        for (double[] x : bottom) depth = Math.max(depth, x[1]);
        e.depth = depth;
        e.time = bottom.get(bottom.size() - 1)[0];
        e.fo2 = fo2;
        e.nitrox = nitrox;
        e.pea = nitrox ? pea(depth, fo2) : depth;
        e.tab = lookup(Math.max(e.pea, 0.1), Math.max(e.time, 0.1));
        if (e.tab.err != null) return e;
        e.prof = build(bottom, e.tab.row.stop);
        e.dtrReal = e.prof.total - e.time;
        e.gasL = gasUse(e.prof.pts, g.sac);
        e.left = g.press - e.gasL / g.tank;
        e.snc = snc(e.prof.pts, fo2);
        return e;
    }

    Eval square(double depth, double time, double fo2, Gear g) {
        return evaluate(square(depth, time), fo2, fo2 > 0.21 + 1e-9, g);
    }

    /** Durées max : sans palier et paliers compris, avec la limite qui bloque. */
    static final class Limits { int noStop, gas, snc, time, tableMax, maxNoStop, max; String byNoStop, byMax; }

    Limits limits(double depth, double fo2, Gear g) {
        boolean nx = fo2 > 0.21 + 1e-9;
        double peaD = nx ? pea(depth, fo2) : depth;
        Integer d = table.ceilingKey((int) Math.ceil(Math.max(peaD, 0.1) - 1e-9));
        if (d == null) return null;
        List<Row> rows = table.get(d);
        Limits l = new Limits();
        l.tableMax = rows.get(rows.size() - 1).t;
        int cap = Math.min(l.tableMax, IMMERSION);
        boolean ns = true, ga = true, sn = true, ti = true;
        for (int T = 1; T <= cap; T++) {
            Eval e = square(depth, T, fo2, g);
            if (e.prof == null) break;
            if (ns && !e.tab.row.hasStops()) l.noStop = T; else ns = false;
            if (ga && e.left >= g.reserve) l.gas = T; else ga = false;
            if (sn && e.snc <= SNC_MAX) l.snc = T; else sn = false;
            if (ti && e.prof.total <= IMMERSION) l.time = T; else ti = false;
            if (!ns && !ga && !sn && !ti) break;
        }
        if (ga) l.gas = cap;
        if (sn) l.snc = cap;
        if (ti) l.time = cap;
        l.maxNoStop = l.noStop; l.byNoStop = "la table";
        if (l.gas < l.maxNoStop) { l.maxNoStop = l.gas; l.byNoStop = "ton bloc"; }
        if (l.snc < l.maxNoStop) { l.maxNoStop = l.snc; l.byNoStop = "l'oxygène"; }
        if (l.time < l.maxNoStop) { l.maxNoStop = l.time; l.byNoStop = "les 2 h"; }
        l.max = l.tableMax; l.byMax = "la table";
        if (l.gas < l.max) { l.max = l.gas; l.byMax = "ton bloc"; }
        if (l.snc < l.max) { l.max = l.snc; l.byMax = "l'oxygène"; }
        if (l.time < l.max) { l.max = l.time; l.byMax = "les 2 h"; }
        return l;
    }

    /** β (bar par minute de DTR) : table Bardassier, sinon estimation sac × 2,25 / V au demi-bar supérieur. */
    static double beta(double tank, double sac) {
        int[] sacs = {15, 17, 20, 22};
        double[][] rows = {{3.0, 3.5, 4.0, 4.5}, {2.5, 2.5, 3.0, 3.5}, {2.0, 2.5, 2.5, 3.0}, {2.0, 2.5, 2.5, 3.0}, {1.5, 2.0, 2.5, 2.5}, {1.5, 1.5, 2.0, 2.0}};
        int[] tanks = {12, 15, 17, 18, 20, 24};
        int ti = -1, si = -1;
        for (int i = 0; i < tanks.length; i++) if (tanks[i] == (int) Math.round(tank)) ti = i;
        for (int i = 0; i < sacs.length; i++) if (sacs[i] >= sac) { si = i; break; }
        if (ti >= 0 && si >= 0) return rows[ti][si];
        return Math.ceil(sac * 2.25 / tank * 2) / 2;
    }

    /** Pression de décollage : règle de Tito [0], minimum exact (remontée + réserve) [1], méthode GP [2]. */
    static double[] decollage(Eval e, Gear g) {
        int i = 0;
        while (i < e.prof.pts.size() && e.prof.pts.get(i)[0] < e.prof.bottomEnd - 1e-9) i++;
        double ascL = gasUse(e.prof.pts.subList(i, e.prof.pts.size()), g.sac);
        double gp = e.tab.row.dtr * beta(g.tank, g.sac) + g.reserve;
        double exact = g.reserve + ascL / g.tank;
        double tito = Math.ceil((e.depth + 2 * e.tab.row.dtr) / 10) * 10;   // règle de Tito retenue
        return new double[]{tito, exact, gp};
    }

    /** Remontée rapide (définition du cours) : 5 min à mi-profondeur minimum, puis les paliers
     *  prévus + 1 min à 6 m + 5 min à 3 m. */
    static final class Rapid { double mid; int[] stop; }

    Rapid rapid(Eval e) {
        if (e.prof == null) return null;
        Rapid r = new Rapid();
        r.mid = Math.ceil(e.depth / 2);
        r.stop = e.tab.row.stop.clone();
        r.stop[6] += 1;
        r.stop[3] += 5;
        return r;
    }
}
