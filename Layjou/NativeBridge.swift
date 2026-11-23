import AVFoundation
import SafariServices
import UIKit
import WebKit

/// Pont entre l'application web embarquée et l'iPhone (gestionnaire de messages « layjou ») :
/// voix françaises et anglaises de l'appareil, vibrations douces, feuille de partage (bilan en PDF, fichiers),
/// liens extérieurs dans une fenêtre Safari intégrée (après la porte parent, côté web).
///
/// Côté web : window.webkit.messageHandlers.layjou.postMessage({ cmd: "speak", id, text, lang, rate, pitch }).
final class NativeBridge: NSObject, WKScriptMessageHandler, AVSpeechSynthesizerDelegate {
    static let name = "layjou"

    weak var webView: WKWebView?
    private let synthesizer = AVSpeechSynthesizer()
    /// Phrase en cours → identifiant donné par la page, rendu à la fin de la lecture.
    private var pending: [ObjectIdentifier: String] = [:]
    private var voices: [String: AVSpeechSynthesisVoice] = [:]

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { return }
        switch cmd {
        case "speak": speak(body)
        case "stop": stopSpeaking()
        case "haptic": haptic(body["kind"] as? String ?? "light")
        case "share": sharePage(title: body["title"] as? String ?? "Bilan Layjou")
        case "shareFile": shareFile(body)
        case "openExternal": openExternal(body["url"] as? String)
        default: break
        }
    }

    // MARK: Voix

    /// Meilleure voix installée pour la langue (« fr-FR », « en-US ») : qualité améliorée si l'appareil l'a,
    /// sinon la voix standard, toujours présente sur iOS pour ces deux langues.
    private func voice(for lang: String) -> AVSpeechSynthesisVoice? {
        let code = lang.lowercased().hasPrefix("en") ? "en-US" : "fr-FR"
        if let cached = voices[code] { return cached }
        let prefix = String(code.prefix(2))
        let candidates = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.lowercased().hasPrefix(prefix) }
        func score(_ v: AVSpeechSynthesisVoice) -> Int {
            var s = v.language == code ? 10 : 0
            if v.quality == .enhanced { s += 20 }
            if #available(iOS 16.0, *), v.quality == .premium { s += 30 }
            // Voix « fantaisie » (Albert, Bahh, Bells…) : jamais pour des enfants qui apprennent à lire.
            if #available(iOS 17.0, *), v.voiceTraits.contains(.isNoveltyVoice) { s -= 100 }
            return s
        }
        let chosen = candidates.max { score($0) < score($1) } ?? AVSpeechSynthesisVoice(language: code)
        voices[code] = chosen
        return chosen
    }

    private func speak(_ body: [String: Any]) {
        let id = body["id"] as? String ?? ""
        let text = (body["text"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return finished(id) }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice(for: body["lang"] as? String ?? "fr-FR")
        // Vitesse du web (1 = normale) → vitesse d'iOS (0,5 = normale).
        let rate = (body["rate"] as? Double) ?? 1
        utterance.rate = max(AVSpeechUtteranceMinimumSpeechRate,
                             min(AVSpeechUtteranceMaximumSpeechRate, AVSpeechUtteranceDefaultSpeechRate * Float(rate)))
        utterance.pitchMultiplier = Float((body["pitch"] as? Double) ?? 1)
        pending[ObjectIdentifier(utterance)] = id
        synthesizer.speak(utterance)
    }

    private func stopSpeaking() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        if let id = pending.removeValue(forKey: ObjectIdentifier(utterance)) { finished(id) }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        if let id = pending.removeValue(forKey: ObjectIdentifier(utterance)) { finished(id) }
    }

    private func finished(_ id: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: [id]),
              let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript("window.__layjouSpeechEnd && window.__layjouSpeechEnd(\(json)[0])")
        }
    }

    // MARK: Vibrations (douces, jamais d'alerte d'erreur)

    private func haptic(_ kind: String) {
        if kind == "success" {
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.success)
        } else {
            let generator = UIImpactFeedbackGenerator(style: .soft)
            generator.prepare()
            generator.impactOccurred(intensity: 0.6)
        }
    }

    // MARK: Partage et impression

    /// Bilan affiché → PDF au format A4 (mise en page d'impression de la page), puis feuille de partage :
    /// imprimer, enregistrer dans Fichiers, envoyer par e-mail ou message.
    private func sharePage(title: String) {
        guard let webView else { return }
        let renderer = UIPrintPageRenderer()
        renderer.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
        let page = CGRect(x: 0, y: 0, width: 595.2, height: 841.8) // A4 en points
        let margin: CGFloat = 36
        renderer.setValue(NSValue(cgRect: page), forKey: "paperRect")
        renderer.setValue(NSValue(cgRect: page.insetBy(dx: margin, dy: margin)), forKey: "printableRect")

        let data = NSMutableData()
        UIGraphicsBeginPDFContextToData(data, page, [kCGPDFContextTitle as String: title])
        renderer.prepare(forDrawingPages: NSRange(location: 0, length: renderer.numberOfPages))
        for index in 0..<renderer.numberOfPages {
            UIGraphicsBeginPDFPage()
            renderer.drawPage(at: index, in: UIGraphicsGetPDFContextBounds())
        }
        UIGraphicsEndPDFContext()

        let file = Self.temporaryFile(named: Self.safeName(title) + ".pdf")
        guard (try? (data as Data).write(to: file, options: .atomic)) != nil else { return }
        present(items: [file])
    }

    /// Fichier préparé par la page (sauvegarde des données, export du compte) : partage plutôt que téléchargement.
    private func shareFile(_ body: [String: Any]) {
        let name = Self.safeName(body["name"] as? String ?? "layjou.txt")
        let content: Data
        if let base64 = body["base64"] as? String, let decoded = Data(base64Encoded: base64) {
            content = decoded
        } else {
            content = Data((body["text"] as? String ?? "").utf8)
        }
        let file = Self.temporaryFile(named: name)
        guard (try? content.write(to: file, options: .atomic)) != nil else { return }
        present(items: [file])
    }

    private static func safeName(_ name: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: " ._-"))
        let cleaned = String(name.unicodeScalars.map { allowed.contains($0) ? Character($0) : "-" })
        return cleaned.isEmpty ? "layjou" : String(cleaned.prefix(80))
    }

    private static func temporaryFile(named name: String) -> URL {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("partage", isDirectory: true)
        try? FileManager.default.removeItem(at: folder) // un seul fichier partagé à la fois
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder.appendingPathComponent(name)
    }

    private func present(items: [Any]) {
        guard let webView, let host = Self.topController(from: webView) else { return }
        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let popover = sheet.popoverPresentationController { // iPad : bulle ancrée au centre de l'écran
            popover.sourceView = webView
            popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        host.present(sheet, animated: true)
    }

    // MARK: Liens extérieurs

    /// Page d'un autre site (aide d'Apple, politique d'un service…) : fenêtre Safari intégrée, jamais l'app Safari.
    /// La porte parent est déjà passée côté web.
    private func openExternal(_ address: String?) {
        guard let address, let url = URL(string: address), url.scheme == "https",
              let webView, let host = Self.topController(from: webView) else { return }
        let safari = SFSafariViewController(url: url)
        safari.dismissButtonStyle = .close
        safari.modalPresentationStyle = .pageSheet
        host.present(safari, animated: true)
    }

    static func topController(from view: UIView) -> UIViewController? {
        var top = view.window?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}
