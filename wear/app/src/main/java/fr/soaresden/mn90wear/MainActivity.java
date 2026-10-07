package fr.soaresden.mn90wear;

import android.app.Activity;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** MN90 Montre : affiche la page web embarquée (assets/www/watch) dans une WebView, hors ligne. */
public class MainActivity extends Activity {

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // L'écran reste allumé pendant qu'on consulte un résultat
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF000000);
        web.setVerticalScrollBarEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);           // réglages mémorisés (localStorage)
        s.setAllowFileAccess(true);             // pages embarquées (file:///android_asset)
        s.setAllowFileAccessFromFileURLs(true); // ../shared/mn90.js depuis la page montre
        web.setWebViewClient(new WebViewClient());
        setContentView(web);

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl("file:///android_asset/www/watch/index.html");
    }

    /** Couronne / lunette rotative : fait défiler la page. */
    @Override
    public boolean onGenericMotionEvent(MotionEvent ev) {
        if (ev.getAction() == MotionEvent.ACTION_SCROLL && ev.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            float delta = -ev.getAxisValue(MotionEvent.AXIS_SCROLL);
            web.scrollBy(0, Math.round(delta * 64));
            return true;
        }
        return super.onGenericMotionEvent(ev);
    }

    /** Geste retour : revient à la liste des questions avant de quitter. */
    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }
}
