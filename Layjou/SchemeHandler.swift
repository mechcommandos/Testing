import Foundation
import WebKit
import UniformTypeIdentifiers

/// Sert l'application embarquée sous app://layjou/… depuis le dossier « www » du paquet : les 54 jeux marchent hors
/// connexion dès le premier lancement. Seules les adresses app://layjou/api/… partent vers le serveur
/// (https://layjou.com/api/…) : compte parent et synchronisation.
final class SchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "app"
    static let host = "layjou"
    static let apiBase = URL(string: "https://layjou.com/api/")!

    private let root: URL = Bundle.main.resourceURL!.appendingPathComponent("www", isDirectory: true)
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = HTTPCookieStorage.shared
        config.httpShouldSetCookies = true
        config.httpCookieAcceptPolicy = .always
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.timeoutIntervalForRequest = 30
        return URLSession(configuration: config)
    }()

    /// Tâches en cours : WebKit plante si l'on répond à une tâche qu'il a déjà arrêtée.
    private var active = Set<ObjectIdentifier>()
    private let lock = NSLock()

    private func begin(_ task: WKURLSchemeTask) { lock.lock(); active.insert(ObjectIdentifier(task)); lock.unlock() }
    private func isActive(_ task: WKURLSchemeTask) -> Bool { lock.lock(); defer { lock.unlock() }; return active.contains(ObjectIdentifier(task)) }
    private func end(_ task: WKURLSchemeTask) -> Bool { lock.lock(); defer { lock.unlock() }; return active.remove(ObjectIdentifier(task)) != nil }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        begin(task)
        guard let url = task.request.url, url.host == Self.host else { return fail(task, URLError(.badURL)) }
        let path = url.path
        if path.hasPrefix("/api/") || path == "/api" {
            proxy(task, url: url)
        } else {
            serveFile(task, path: path)
        }
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        _ = end(task)
    }

    // MARK: Fichiers embarqués

    private func serveFile(_ task: WKURLSchemeTask, path: String) {
        var relative = path.removingPercentEncoding ?? path
        if relative.isEmpty || relative == "/" { relative = "/app.html" }
        if relative.hasSuffix("/") { relative += "index.html" }
        let file = root.appendingPathComponent(String(relative.dropFirst())).standardizedFileURL
        // Pas de sortie du dossier www (« ../ »).
        guard file.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            return respond(task, status: 404, headers: ["Content-Type": "text/plain; charset=utf-8"], body: Data("Introuvable".utf8))
        }
        var headers = [
            "Content-Type": Self.mimeType(for: file),
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes",
        ]
        // Requêtes partielles (sons) : WebKit en envoie pour l'audio et la vidéo.
        if let range = task.request.value(forHTTPHeaderField: "Range"), let (start, endIndex) = Self.parseRange(range, length: data.count) {
            headers["Content-Range"] = "bytes \(start)-\(endIndex)/\(data.count)"
            headers["Content-Length"] = String(endIndex - start + 1)
            return respond(task, status: 206, headers: headers, body: data.subdata(in: start..<(endIndex + 1)))
        }
        headers["Content-Length"] = String(data.count)
        respond(task, status: 200, headers: headers, body: data)
    }

    static func parseRange(_ header: String, length: Int) -> (Int, Int)? {
        guard length > 0, header.hasPrefix("bytes=") else { return nil }
        let spec = header.dropFirst(6).split(separator: ",").first.map(String.init) ?? ""
        let parts = spec.split(separator: "-", omittingEmptySubsequences: false).map { String($0).trimmingCharacters(in: .whitespaces) }
        guard parts.count == 2 else { return nil }
        if parts[0].isEmpty, let suffix = Int(parts[1]), suffix > 0 {
            return (max(0, length - suffix), length - 1)
        }
        guard let start = Int(parts[0]), start < length else { return nil }
        let endIndex = Int(parts[1]).map { min($0, length - 1) } ?? (length - 1)
        return endIndex >= start ? (start, endIndex) : nil
    }

    static func mimeType(for file: URL) -> String {
        switch file.pathExtension.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "webmanifest": return "application/manifest+json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "ico": return "image/x-icon"
        case "mp3": return "audio/mpeg"
        case "m4a", "aac": return "audio/mp4"
        case "ogg", "oga": return "audio/ogg"
        case "wav": return "audio/wav"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "txt", "md": return "text/plain; charset=utf-8"
        default:
            return UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        }
    }

    // MARK: API du serveur (compte parent, synchronisation)

    private func proxy(_ task: WKURLSchemeTask, url: URL) {
        let path = String(url.path.dropFirst("/api/".count))
        var components = URLComponents(url: Self.apiBase.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        components.percentEncodedQuery = URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedQuery
        guard let target = components.url else { return fail(task, URLError(.badURL)) }

        var request = URLRequest(url: target)
        request.httpMethod = task.request.httpMethod ?? "GET"
        for (name, value) in task.request.allHTTPHeaderFields ?? [:] {
            let lower = name.lowercased()
            if ["origin", "referer", "cookie", "host", "content-length"].contains(lower) { continue }
            request.setValue(value, forHTTPHeaderField: name)
        }
        // Le serveur vérifie que l'origine est la sienne (protection contre les requêtes d'autres sites).
        request.setValue("https://layjou.com", forHTTPHeaderField: "Origin")
        if let body = task.request.httpBody {
            request.httpBody = body
        } else if let stream = task.request.httpBodyStream {
            request.httpBody = Self.read(stream)
        }

        let job = session.dataTask(with: request) { [weak self] data, response, error in
            guard let self else { return }
            if let error { return self.fail(task, error) }
            guard let http = response as? HTTPURLResponse else { return self.fail(task, URLError(.badServerResponse)) }
            var headers: [String: String] = [:]
            for (key, value) in http.allHeaderFields {
                guard let name = key as? String, let text = value as? String else { continue }
                // Le cookie de connexion reste dans le stockage natif (HTTPCookieStorage), jamais dans la vue web.
                if ["set-cookie", "content-encoding", "content-length", "transfer-encoding"].contains(name.lowercased()) { continue }
                headers[name] = text
            }
            let body = data ?? Data()
            headers["Content-Length"] = String(body.count)
            self.respond(task, status: http.statusCode, headers: headers, body: body)
        }
        job.resume()
    }

    private static func read(_ stream: InputStream) -> Data {
        var data = Data()
        stream.open()
        defer { stream.close() }
        let size = 16_384
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: size)
        defer { buffer.deallocate() }
        while stream.hasBytesAvailable {
            let count = stream.read(buffer, maxLength: size)
            if count <= 0 { break }
            data.append(buffer, count: count)
        }
        return data
    }

    // MARK: Réponses

    private func respond(_ task: WKURLSchemeTask, status: Int, headers: [String: String], body: Data) {
        let send = {
            guard self.isActive(task), let url = task.request.url,
                  let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers) else { return }
            task.didReceive(response)
            task.didReceive(body)
            if self.end(task) { task.didFinish() }
        }
        Thread.isMainThread ? send() : DispatchQueue.main.async(execute: send)
    }

    private func fail(_ task: WKURLSchemeTask, _ error: Error) {
        let send = {
            if self.end(task) { task.didFailWithError(error) }
        }
        Thread.isMainThread ? send() : DispatchQueue.main.async(execute: send)
    }
}
