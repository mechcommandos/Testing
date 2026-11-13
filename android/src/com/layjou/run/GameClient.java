package com.layjou.run;

import android.content.Context;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;

/** Sert les fichiers de assets/www sous l'origine factice de l'application. */
class GameClient extends WebViewClient {
    private final Context context;

    GameClient(Context context) { this.context = context.getApplicationContext(); }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (!MainActivity.HOST.equals(request.getUrl().getHost())) return null;
        String path = request.getUrl().getPath();
        if (path == null || path.equals("/")) path = "/index.html";
        try {
            return new WebResourceResponse(mime(path), "utf-8", context.getAssets().open("www" + path));
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
        }
    }

    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }
}
