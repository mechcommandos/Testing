import SwiftUI

/// Layjou pour iPhone et iPad : l'application embarquée dans le paquet (app://layjou/app.html, jeux hors connexion)
/// en plein écran,
/// précédée de l'écran de démarrage (mascotte et logo) pendant au moins 3 secondes.
@main
struct LayjouApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

struct RootView: View {
    static let startURL = URL(string: "app://layjou/app.html")!
    /// Durée minimale de l'écran de démarrage, comme sur Android.
    static let splashSeconds: Double = 3

    @State private var showSplash = true

    var body: some View {
        ZStack {
            WebView(url: Self.startURL)
                .ignoresSafeArea()
            if showSplash {
                SplashView()
                    .transition(.opacity)
            }
        }
        .task {
            try? await Task.sleep(nanoseconds: UInt64(Self.splashSeconds * 1_000_000_000))
            withAnimation(.easeOut(duration: 0.45)) { showSplash = false }
        }
    }
}

/// Même image que l'écran de lancement (Info.plist, UILaunchScreen) : on passe de l'un à l'autre sans saut.
struct SplashView: View {
    var body: some View {
        ZStack {
            Color("LaunchBackground").ignoresSafeArea()
            Image("Splash")
                .accessibilityLabel("Layjou")
        }
    }
}
