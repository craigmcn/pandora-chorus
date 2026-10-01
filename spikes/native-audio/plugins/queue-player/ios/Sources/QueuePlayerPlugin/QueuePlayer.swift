import AVFoundation
import MediaPlayer
import UIKit

struct QueueTrack {
    let url: URL
    let title: String
    let artist: String
}

/// Loops a list of local tracks with AVQueuePlayer, which preloads the next
/// item natively so track changes don't depend on the web view being awake.
final class QueuePlayer: NSObject {
    static let transitionTimeout: TimeInterval = 10

    var onEvent: (([String: Any]) -> Void)?
    private(set) var log: [[String: Any]] = []

    private let player = AVQueuePlayer()
    private var tracks: [QueueTrack] = []
    private(set) var index = 0
    private var rate: Float = 1
    private var pendingTransition: (from: Int, to: Int, at: Date, locked: Bool)?
    private var lastEndedAt: Date?
    private var itemIndex: [ObjectIdentifier: Int] = [:]
    private var observations: [NSKeyValueObservation] = []

    override init() {
        super.init()
        observations.append(player.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
            DispatchQueue.main.async { self?.timeControlStatusChanged(player) }
        })
        observations.append(player.observe(\.currentItem, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async { self?.currentItemChanged() }
        })
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(itemEnded(_:)), name: .AVPlayerItemDidPlayToEndTime, object: nil)
        center.addObserver(self, selector: #selector(itemFailed(_:)), name: .AVPlayerItemFailedToPlayToEndTime, object: nil)
        center.addObserver(self, selector: #selector(interrupted(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        // Protected data becomes unavailable when the device locks (with a passcode),
        // which tells a lock apart from simply switching apps.
        center.addObserver(forName: UIApplication.protectedDataWillBecomeUnavailableNotification, object: nil, queue: .main) { [weak self] _ in
            self?.record("locked")
        }
        center.addObserver(forName: UIApplication.protectedDataDidBecomeAvailableNotification, object: nil, queue: .main) { [weak self] _ in
            self?.record("unlocked")
        }
        center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.record("background")
        }
        center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.record("foreground")
        }
        setupRemoteCommands()
    }

    // MARK: - Logging

    func record(_ ev: String, _ detail: String = "", extra: [String: Any] = [:]) {
        var entry: [String: Any] = [
            "t": Date().timeIntervalSince1970 * 1000,
            "ev": ev,
            "detail": detail,
            "track": index + 1,
            "locked": !UIApplication.shared.isProtectedDataAvailable,
            "app": appState(),
        ]
        entry.merge(extra) { _, new in new }
        log.append(entry)
        if log.count > 500 { log.removeFirst(log.count - 500) }
        onEvent?(entry)
    }

    func clearLog() {
        log.removeAll()
    }

    private func appState() -> String {
        switch UIApplication.shared.applicationState {
        case .active: return "active"
        case .inactive: return "inactive"
        default: return "background"
        }
    }

    // MARK: - Queue

    func load(_ tracks: [QueueTrack], rate: Float) {
        self.tracks = tracks
        self.rate = rate
        index = 0
        rebuildQueue(from: 0)
        record("loaded", "\(tracks.count) tracks")
    }

    private func makeItem(_ i: Int) -> AVPlayerItem {
        let item = AVPlayerItem(url: tracks[i].url)
        // Keeps pitch unchanged when slowed down.
        item.audioTimePitchAlgorithm = .timeDomain
        itemIndex[ObjectIdentifier(item)] = i
        return item
    }

    private func nextIndex(_ i: Int) -> Int {
        (i + 1) % tracks.count
    }

    /// Queue holds the current track plus the next one; one more is appended
    /// at each change, so the loop never runs dry.
    private func rebuildQueue(from i: Int) {
        player.removeAllItems()
        itemIndex.removeAll()
        player.insert(makeItem(i), after: nil)
        player.insert(makeItem(nextIndex(i)), after: nil)
        updateNowPlaying()
    }

    @objc private func itemEnded(_ note: Notification) {
        guard let item = note.object as? AVPlayerItem, let i = itemIndex[ObjectIdentifier(item)] else { return }
        DispatchQueue.main.async {
            self.lastEndedAt = Date()
            self.record("ended", "", extra: ["track": i + 1])
        }
    }

    /// The queue advancing by itself (not via next/previous, which set
    /// `index` first) is a track change: top up the queue and time it.
    private func currentItemChanged() {
        guard let item = player.currentItem, let i = itemIndex[ObjectIdentifier(item)], i != index else { return }
        let from = index
        index = i
        player.insert(makeItem(nextIndex(i)), after: nil)
        let started = lastEndedAt ?? Date()
        lastEndedAt = nil
        pendingTransition = (from: from, to: i, at: started, locked: !UIApplication.shared.isProtectedDataAvailable)
        updateNowPlaying()
        if player.timeControlStatus == .playing { finishTransition(ok: true) }
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.transitionTimeout) {
            if let p = self.pendingTransition, p.at == started {
                self.finishTransition(ok: false, reason: "not playing after \(Int(Self.transitionTimeout))s (\(self.statusName()))")
            }
        }
    }

    private func finishTransition(ok: Bool, reason: String = "") {
        guard let p = pendingTransition else { return }
        pendingTransition = nil
        let gap = Int(Date().timeIntervalSince(p.at) * 1000)
        record("transition", "\(ok ? "ok" : "FAILED") \(p.from + 1)→\(p.to + 1) gap \(gap)ms \(reason)",
               extra: ["ok": ok, "lockedAtEnd": p.locked, "gapMs": gap])
    }

    @objc private func itemFailed(_ note: Notification) {
        let err = (note.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error)?.localizedDescription ?? "unknown"
        DispatchQueue.main.async { self.record("error", err) }
    }

    // MARK: - Controls

    func play() {
        activateSession()
        if #available(iOS 16.0, *) {
            player.defaultRate = rate
            player.play()
        } else {
            player.playImmediately(atRate: rate)
        }
        updateNowPlaying()
    }

    func pause() {
        player.pause()
        updateNowPlaying()
    }

    func next() {
        guard !tracks.isEmpty else { return }
        pendingTransition = nil
        index = nextIndex(index)
        player.advanceToNextItem()
        player.insert(makeItem(nextIndex(index)), after: nil)
        updateNowPlaying()
        record("next")
    }

    func previous() {
        guard !tracks.isEmpty else { return }
        pendingTransition = nil
        let wasPlaying = player.timeControlStatus != .paused
        index = (index - 1 + tracks.count) % tracks.count
        rebuildQueue(from: index)
        if wasPlaying { play() }
        record("previous")
    }

    func setRate(_ rate: Float) {
        self.rate = rate
        if #available(iOS 16.0, *) { player.defaultRate = rate }
        if player.timeControlStatus != .paused { player.rate = rate }
        updateNowPlaying()
        record("rate", "\(rate)")
    }

    var isPlaying: Bool {
        player.timeControlStatus != .paused
    }

    private func activateSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            record("session-error", error.localizedDescription)
        }
    }

    private func statusName() -> String {
        switch player.timeControlStatus {
        case .playing: return "playing"
        case .paused: return "paused"
        case .waitingToPlayAtSpecifiedRate:
            return "waiting \(player.reasonForWaitingToPlay?.rawValue ?? "")"
        @unknown default: return "unknown"
        }
    }

    private func timeControlStatusChanged(_ player: AVPlayer) {
        record(statusName())
        if player.timeControlStatus == .playing { finishTransition(ok: true) }
        updateNowPlaying()
    }

    @objc private func interrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        DispatchQueue.main.async {
            if type == .began {
                self.record("interruption-began")
            } else {
                let opts = (note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt).map(AVAudioSession.InterruptionOptions.init) ?? []
                self.record("interruption-ended", opts.contains(.shouldResume) ? "resuming" : "")
                if opts.contains(.shouldResume) { self.play() }
            }
        }
    }

    // MARK: - Lock screen

    private func setupRemoteCommands() {
        let commands = MPRemoteCommandCenter.shared()
        commands.playCommand.addTarget { [weak self] _ in
            self?.record("remote:play")
            self?.play()
            return .success
        }
        commands.pauseCommand.addTarget { [weak self] _ in
            self?.record("remote:pause")
            self?.pause()
            return .success
        }
        commands.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            self.record("remote:toggle")
            self.isPlaying ? self.pause() : self.play()
            return .success
        }
        commands.nextTrackCommand.addTarget { [weak self] _ in
            self?.record("remote:next")
            self?.next()
            return .success
        }
        commands.previousTrackCommand.addTarget { [weak self] _ in
            self?.record("remote:previous")
            self?.previous()
            return .success
        }
    }

    private func updateNowPlaying() {
        guard !tracks.isEmpty else { return }
        let track = tracks[index]
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: track.title,
            MPMediaItemPropertyArtist: track.artist,
            MPNowPlayingInfoPropertyPlaybackRate: player.timeControlStatus == .playing ? Double(rate) : 0.0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate: Double(rate),
        ]
        if let item = player.currentItem {
            let duration = item.duration.seconds
            if duration.isFinite { info[MPMediaItemPropertyPlaybackDuration] = duration }
            info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = item.currentTime().seconds
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
}
