import AVFoundation
import SwiftUI
import WebKit

/// Vue web de l'application, servie depuis le paquet (app://layjou/app.html) : les jeux marchent hors connexion,
/// les données restent sur l'appareil (profils, progression), sons et voix sans geste préalable.
/// Pas de zoom, pas de sélection de texte, pas d'aperçu au clic long, pas de rebond du défilement.
/// Aucune page d'un autre site ne s'ouvre dans la vue : les liens extérieurs passent par la porte parent,
/// puis par une fenêtre Safari intégrée (NativeBridge).
struct WebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        // Sons du jeu même avec le bouton silencieux de l'iPhone, comme une application de jeux.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default() // stockage persistant (IndexedDB) : la progression reste sur l'appareil
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "LayjouIOS/1.3"
        config.setURLSchemeHandler(context.coordinator.scheme, forURLScheme: SchemeHandler.scheme)
        config.userContentController.add(WeakMessageHandler(context.coordinator.bridge), name: NativeBridge.name)
        config.dataDetectorTypes = []

        let web = WKWebView(frame: .zero, configuration: config)
        context.coordinator.bridge.webView = web
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = false
        web.allowsLinkPreview = false // pas d'aperçu au clic long
        web.isOpaque = false
        web.backgroundColor = .white

        let scroll = web.scrollView
        scroll.contentInsetAdjustmentBehavior = .never // la page gère les zones sûres (viewport-fit=cover)
        scroll.bounces = false
        scroll.alwaysBounceVertical = false
        scroll.alwaysBounceHorizontal = false
        scroll.minimumZoomScale = 1
        scroll.maximumZoomScale = 1
        scroll.bouncesZoom = false
        scroll.delegate = context.coordinator
        scroll.pinchGestureRecognizer?.isEnabled = false

        Coordinator.migrateCookies { web.load(URLRequest(url: url)) }
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, UIScrollViewDelegate {
        let scheme = SchemeHandler()
        let bridge = NativeBridge()

        /// Version 1.2 (page en ligne) : le cookie du compte parent était dans la vue web.
        /// Il passe une fois dans le stockage natif, utilisé par SchemeHandler pour l'API : le parent reste connecté.
        static func migrateCookies(then done: @escaping () -> Void) {
            let key = "cookiesMigrated"
            guard !UserDefaults.standard.bool(forKey: key) else { return done() }
            WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
                for cookie in cookies where cookie.domain.hasSuffix("layjou.com") && cookie.name == "layjou_auth" {
                    HTTPCookieStorage.shared.setCookie(cookie)
                }
                UserDefaults.standard.set(true, forKey: key)
                DispatchQueue.main.async(execute: done)
            }
        }

        // MARK: Navigation : seulement les pages de l'application

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let target = action.request.url, let scheme = target.scheme?.lowercased() else { return decisionHandler(.cancel) }
            switch scheme {
            case SchemeHandler.scheme, "about", "blob", "data":
                decisionHandler(.allow)
            case "mailto":
                // Écrire au support : application Mail (la page a déjà demandé la porte parent).
                UIApplication.shared.open(target)
                decisionHandler(.cancel)
            default:
                // Un autre site ne s'ouvre jamais dans la vue (ni dans Safari sans la porte parent).
                // Les sous-cadres (aucun aujourd'hui) n'ont pas accès au web non plus.
                decisionHandler(.cancel)
            }
        }

        /// Liens « target=_blank » : ignorés, la page passe par openExternal après la porte parent.
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            nil
        }

        /// iOS a arrêté la page (mémoire) : on la recharge plutôt que d'afficher un écran blanc.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        // MARK: Pas de zoom

        func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }

        func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
            scrollView.pinchGestureRecognizer?.isEnabled = false
        }

        // MARK: Fenêtres de la page (alert, confirm, prompt)

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            present(alert, from: webView, orElse: completionHandler)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Annuler", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            present(alert, from: webView) { completionHandler(false) }
        }

        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            alert.addAction(UIAlertAction(title: "Annuler", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
            present(alert, from: webView) { completionHandler(nil) }
        }

        private func present(_ alert: UIAlertController, from view: UIView, orElse fallback: @escaping () -> Void) {
            guard let host = NativeBridge.topController(from: view) else { return fallback() }
            host.present(alert, animated: true)
        }
    }
}

/// WKUserContentController garde ses gestionnaires : relais faible pour ne pas retenir le pont (et la vue) à vie.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
