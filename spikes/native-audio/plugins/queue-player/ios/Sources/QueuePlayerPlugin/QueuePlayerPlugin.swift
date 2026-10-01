import Capacitor
import Foundation

@objc(QueuePlayerPlugin)
public class QueuePlayerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QueuePlayerPlugin"
    public let jsName = "QueuePlayer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "next", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previous", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLog", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearLog", returnType: CAPPluginReturnPromise),
    ]
    private let player = QueuePlayer()

    override public func load() {
        // The log lives natively so it stays accurate while the web view is
        // suspended; events are also pushed live when the page is awake.
        player.onEvent = { [weak self] entry in
            self?.notifyListeners("event", data: entry)
        }
        DispatchQueue.main.async { self.player.record("plugin-loaded") }
    }

    @objc func load(_ call: CAPPluginCall) {
        guard let raw = call.getArray("tracks") as? [[String: Any]] else {
            call.reject("tracks required")
            return
        }
        // Paths are relative to the app's bundled web assets.
        let base = Bundle.main.resourceURL!.appendingPathComponent("public")
        let tracks = raw.compactMap { t -> QueueTrack? in
            guard let path = t["path"] as? String else { return nil }
            return QueueTrack(url: base.appendingPathComponent(path),
                              title: t["title"] as? String ?? path,
                              artist: t["artist"] as? String ?? "")
        }
        let rate = call.getFloat("rate") ?? 1
        DispatchQueue.main.async {
            self.player.load(tracks, rate: rate)
            call.resolve()
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.player.play()
            call.resolve()
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.player.pause()
            call.resolve()
        }
    }

    @objc func next(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.player.next()
            call.resolve()
        }
    }

    @objc func previous(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.player.previous()
            call.resolve()
        }
    }

    @objc func setRate(_ call: CAPPluginCall) {
        let rate = call.getFloat("rate") ?? 1
        DispatchQueue.main.async {
            self.player.setRate(rate)
            call.resolve()
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["index": self.player.index, "playing": self.player.isPlaying])
        }
    }

    @objc func getLog(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["entries": self.player.log])
        }
    }

    @objc func clearLog(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.player.clearLog()
            call.resolve()
        }
    }
}
